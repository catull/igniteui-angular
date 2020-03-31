import {
    Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ContentChild, ViewChildren,
    QueryList, ViewChild, ElementRef, TemplateRef, DoCheck, AfterContentInit, HostBinding, forwardRef, OnInit, AfterViewInit, HostListener
} from '@angular/core';
import { GridBaseAPIService } from '../api.service';
import { IgxGridBaseDirective } from '../grid-base.directive';
import { IgxGridNavigationService } from '../grid-navigation.service';
import { IgxGridAPIService } from './grid-api.service';
import { ISortingExpression } from '../../data-operations/sorting-expression.interface';
import { cloneArray, IBaseEventArgs } from '../../core/utils';
import { IGroupByRecord } from '../../data-operations/groupby-record.interface';
import { IgxGroupByRowTemplateDirective, IgxGridDetailTemplateDirective } from './grid.directives';
import { IgxGridGroupByRowComponent } from './groupby-row.component';
import { IGroupByExpandState } from '../../data-operations/groupby-expand-state.interface';
import { IBaseChipEventArgs, IChipClickEventArgs, IChipKeyDownEventArgs } from '../../chips/chip.component';
import { IChipsAreaReorderEventArgs } from '../../chips/chips-area.component';
import { IgxColumnComponent } from '../columns/column.component';
import { takeUntil, first } from 'rxjs/operators';
import { IgxFilteringService } from '../filtering/grid-filtering.service';
import { IGroupingExpression } from '../../data-operations/grouping-expression.interface';
import { IgxColumnResizingService } from '../resizing/resizing.service';
import { IgxGridSummaryService } from '../summaries/grid-summary.service';
import { IgxGridSelectionService, IgxGridCRUDService } from '../selection/selection.service';
import { IgxForOfSyncService, IgxForOfScrollSyncService } from '../../directives/for-of/for_of.sync.service';
import { IgxDragIndicatorIconDirective } from '../row-drag.directive';
import { IgxGridMRLNavigationService } from '../grid-mrl-navigation.service';
import { IgxRowIslandAPIService } from '../hierarchical-grid/row-island-api.service';
import { FilterMode } from '../common/enums';
import { GridType } from '../common/grid.interface';
import { DeprecateMethod } from '../../core/deprecateDecorators';

let NEXT_ID = 0;

export interface IGroupingDoneEventArgs extends IBaseEventArgs {
    expressions: Array<ISortingExpression> | ISortingExpression;
    groupedColumns: Array<IgxColumnComponent> | IgxColumnComponent;
    ungroupedColumns: Array<IgxColumnComponent> | IgxColumnComponent;
}

/**
 * Grid provides a way to present and manipulate tabular data.
 * @igxModule IgxGridModule
 * @igxGroup Grids & Lists
 * @igxKeywords grid, table
 * @igxTheme igx-grid-theme
 * @remarks
 * The Ignite UI Grid is used for presenting and manipulating tabular data in the simplest way possible.  Once data
 * has been bound, it can be manipulated through filtering, sorting & editing operations.
 * @example
 * ```html
 * <igx-grid [data]="employeeData" autoGenerate="false">
 *   <igx-column field="first" header="First Name"></igx-column>
 *   <igx-column field="last" header="Last Name"></igx-column>
 *   <igx-column field="role" header="Role"></igx-column>
 * </igx-grid>
 * ```
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false,
    providers: [
        IgxGridNavigationService,
        IgxGridSummaryService,
        IgxGridSelectionService,
        IgxGridCRUDService,
        { provide: GridBaseAPIService, useClass: IgxGridAPIService },
        { provide: IgxGridBaseDirective, useExisting: forwardRef(() => IgxGridComponent) },
        IgxFilteringService,
        IgxColumnResizingService,
        IgxForOfSyncService,
        IgxForOfScrollSyncService,
        IgxRowIslandAPIService
    ],
    selector: 'igx-grid',
    templateUrl: './grid.component.html'
})
export class IgxGridComponent extends IgxGridBaseDirective implements GridType, OnInit, DoCheck, AfterContentInit, AfterViewInit {
    private _id = `igx-grid-${NEXT_ID++}`;
    /**
     * @hidden @internal
     */
    public groupingResult: any[];

    /**
     * @hidden @internal
     */
    public groupingMetadata: any[];

    /**
     * @hidden @internal
     */
    public groupingFlatResult: any[];
    /**
     * @hidden
     */
    protected _groupingExpressions: IGroupingExpression[] = [];
    /**
     * @hidden
     */
    protected _groupingExpandState: IGroupByExpandState[] = [];
    /**
     * @hidden
     */
    protected _groupRowTemplate: TemplateRef<any>;
    /**
     * @hidden
     */
    protected _groupAreaTemplate: TemplateRef<any>;
    /**
     * @hidden
     */
    protected groupingDiffer;
    private _data;
    private _hideGroupedColumns = false;
    private _dropAreaMessage = null;

    /**
     * Gets/Sets the value of the `id` attribute.
     * @remarks
     * If not provided it will be automatically generated.
     * @example
     * ```html
     * <igx-grid [id]="'igx-grid-1'" [data]="Data" [autoGenerate]="true"></igx-grid>
     * ```
     */
    @HostBinding('attr.id')
    @Input()
    public get id(): string {
        return this._id;
    }
    public set id(value: string) {
        this._id = value;
    }

    /**
     * Gets/Sets the array of data that populates the `IgxGridComponent`.
     * @example
     * ```html
     * <igx-grid [data]="Data" [autoGenerate]="true"></igx-grid>
     * ```
     */
    @Input()
    public get data(): any[] {
        return this._data;
    }

    public set data(value: any[]) {
        this._data = value || [];
        this.summaryService.clearSummaryCache();
        if (this.shouldGenerate) {
            this.setupColumns();
        }
        this.cdr.markForCheck();
    }

    /**
     * Gets/Sets an array of objects containing the filtered data.
     * @example
     * ```typescript
     * let filteredData = this.grid.filteredData;
     * this.grid.filteredData = [...];
     * ```
     */
    get filteredData() {
        return this._filteredData;
    }

    set filteredData(value) {
        this._filteredData = value;
    }

    /**
     * Gets/Sets the total number of records in the data source.
     * @remarks
     * This property is required for remote grid virtualization to function when it is bound to remote data.
     * @example
     * ```typescript
     * const itemCount = this.grid1.totalItemCount;
     * this.grid1.totalItemCount = 55;
     * ```
     */
    set totalItemCount(count) {
        this.verticalScrollContainer.totalItemCount = count;
        this.cdr.detectChanges();
    }

    get totalItemCount() {
        return this.verticalScrollContainer.totalItemCount;
    }

    private get _gridAPI(): IgxGridAPIService {
        return this.gridAPI as IgxGridAPIService;
    }
    private _filteredData = null;

    private childDetailTemplates: Map<any, any> = new Map();

    /**
     * Gets/Sets the group by state.
     * @example
     * ```typescript
     * let groupByState = this.grid.groupingExpressions;
     * this.grid.groupingExpressions = [...];
     * ```
     * @remarks
     * Supports two-way data binding.
     * @example
     * ```html
     * <igx-grid #grid [data]="Data" [autoGenerate]="true" [(groupingExpressions)]="model.groupingExpressions"></igx-grid>
     * ```
     */
    @Input()
    get groupingExpressions(): IGroupingExpression[] {
        return this._groupingExpressions;
    }

    set groupingExpressions(value: IGroupingExpression[]) {
        if (value && value.length > 10) {
            throw Error('Maximum amount of grouped columns is 10.');
        }
        const oldExpressions: IGroupingExpression[] = this.groupingExpressions;
        const newExpressions: IGroupingExpression[] = value;
        this._groupingExpressions = cloneArray(value);
        this.groupingExpressionsChange.emit(this._groupingExpressions);
        this.chipsGoupingExpressions = cloneArray(value);
        if (this._gridAPI.grid) {
            /* grouping should work in conjunction with sorting
            and without overriding separate sorting expressions */
            this._applyGrouping();
            this._gridAPI.arrange_sorting_expressions();
            this.notifyChanges();
        } else {
            // setter called before grid is registered in grid API service
            this.sortingExpressions.unshift.apply(this.sortingExpressions, this._groupingExpressions);
        }
        if (!this._init && JSON.stringify(oldExpressions) !== JSON.stringify(newExpressions) && this.columnList) {
            const groupedCols: IgxColumnComponent[] = [];
            const ungroupedCols: IgxColumnComponent[] = [];
            const groupedColsArr = newExpressions.filter((obj) => {
                return !oldExpressions.some((obj2) => {
                    return obj.fieldName === obj2.fieldName;
                });
            });
            groupedColsArr.forEach((elem) => {
                groupedCols.push(this.getColumnByName(elem.fieldName));
            }, this);
            const ungroupedColsArr = oldExpressions.filter((obj) => {
                return !newExpressions.some((obj2) => {
                    return obj.fieldName === obj2.fieldName;
                });
            });
            ungroupedColsArr.forEach((elem) => {
                ungroupedCols.push(this.getColumnByName(elem.fieldName));
            }, this);
            this.notifyChanges();
            const groupingDoneArgs: IGroupingDoneEventArgs = {
                expressions: newExpressions,
                groupedColumns: groupedCols,
                ungroupedColumns: ungroupedCols
            };
            this.onGroupingDone.emit(groupingDoneArgs);
        }
    }

    /**
     * @hidden
     */
    @Output()
    public groupingExpressionsChange = new EventEmitter<IGroupingExpression[]>();

    /**
     * Gets/Sets a list of expansion states for group rows.
     * @remarks
     * Includes only states that differ from the default one (controlled through groupsExpanded and states that the user has changed.
     * Contains the expansion state (expanded: boolean) and the unique identifier for the group row (Array).
     * Supports two-way data binding.
     * @example
     * ```html
     * <igx-grid #grid [data]="Data" [autoGenerate]="true" [(groupingExpansionState)]="model.groupingExpansionState"></igx-grid>
     * ```
     */
    @Input()
    get groupingExpansionState() {
        return this._groupingExpandState;
    }

    set groupingExpansionState(value) {
        if (value !== this._groupingExpandState) {
            this.groupingExpansionStateChange.emit(value);
        }
        this._groupingExpandState = value;
        if (this.gridAPI.grid) {
            this.cdr.detectChanges();
        }
    }

    /**
     * @hidden @internal
     */
    @Output()
    public groupingExpansionStateChange = new EventEmitter<IGroupByExpandState[]>();

    /**
     * Gets/Sets whether created groups are rendered expanded or collapsed.
     * @remarks
     * The default rendered state is expanded.
     * @example
     * ```html
     * <igx-grid #grid [data]="Data" [groupsExpanded]="false" [autoGenerate]="true"></igx-grid>
     * ```
     */
    @Input()
    public groupsExpanded = true;

    /**
     * Gets the hierarchical representation of the group by records.
     * @example
     * ```typescript
     * let groupRecords = this.grid.groupsRecords;
     * ```
     */
    public groupsRecords: IGroupByRecord[] = [];

    /**
     * Gets/Sets whether the grouped columns should be hidden.
     * @remarks
     * The default value is "false"
     * @example
     * ```html
     * <igx-grid #grid [data]="localData" [hideGroupedColumns]="true" [autoGenerate]="true"></igx-grid>
     * ```
     */
    @Input()
    public get hideGroupedColumns() {
        return this._hideGroupedColumns;
    }

    public set hideGroupedColumns(value: boolean) {
        if (value) {
            this.groupingDiffer = this.differs.find(this.groupingExpressions).create();
        } else {
            this.groupingDiffer = null;
        }
        if (this.columnList && this.groupingExpressions) {
            this._setGroupColsVisibility(value);
        }

        this._hideGroupedColumns = value;
    }

    /**
     * Gets/Sets the message displayed inside the GroupBy drop area where columns can be dragged on.
     * @remarks
     * The grid needs to have at least one groupable column in order the GroupBy area to be displayed.
     * @example
     * ```html
     * <igx-grid dropAreaMessage="Drop here to group!">
     *      <igx-column [groupable]="true" field="ID"></igx-column>
     * </igx-grid>
     * ```
     */
    @Input()
    set dropAreaMessage(value: string) {
        this._dropAreaMessage = value;
        this.notifyChanges();
    }

    get dropAreaMessage(): string {
        return this._dropAreaMessage || this.resourceStrings.igx_grid_groupByArea_message;
    }

    /**
     * Gets/Sets the template that will be rendered as a GroupBy drop area.
     * @remarks
     * The grid needs to have at least one groupable column in order the GroupBy area to be displayed.
     * @example
     * ```html
     * <igx-grid [dropAreaTemplate]="dropAreaRef">
     * </igx-grid>
     * <ng-template #myDropArea>
     *      <span> Custom drop area! </span>
     * </ng-template>
     * ```
     */
    @Input()
    public dropAreaTemplate: TemplateRef<any>;

    /**
     * Emitted when columns are grouped/ungrouped.
     * @remarks
     * The `onGroupingDone` event would be raised only once if several columns get grouped at once by calling
     * the `groupBy()` or `clearGrouping()` API methods and passing an array as an argument.
     * The event arguments provide the `expressions`, `groupedColumns` and `ungroupedColumns` properties, which contain
     * the `ISortingExpression` and the `IgxColumnComponent` related to the grouping/ungrouping operation.
     * Please note that `groupedColumns` and `ungroupedColumns` show only the **newly** changed columns (affected by the **last**
     * grouping/ungrouping operation), not all columns which are currently grouped/ungrouped.
     * columns.
     * @example
     * ```html
     * <igx-grid #grid [data]="localData" (onGroupingDone)="groupingDone($event)" [autoGenerate]="true"></igx-grid>
     * ```
     */
    @Output()
    public onGroupingDone = new EventEmitter<IGroupingDoneEventArgs>();

    /**
     * @hidden @internal
     */
    @ContentChild(IgxGroupByRowTemplateDirective, { read: IgxGroupByRowTemplateDirective })
    protected groupTemplate: IgxGroupByRowTemplateDirective;

    /**
     * @hidden @internal
     */
    @ContentChild(IgxGridDetailTemplateDirective, { read: IgxGridDetailTemplateDirective, static: false })
    protected gridDetailsTemplate: IgxGridDetailTemplateDirective;

    @ViewChildren(IgxGridGroupByRowComponent, { read: IgxGridGroupByRowComponent })
    private _groupsRowList: QueryList<IgxGridGroupByRowComponent>;

    /**
     * @hidden @internal
     */
    @ViewChild('defaultDropArea', { read: TemplateRef, static: true })
    public defaultDropAreaTemplate: TemplateRef<any>;

    /**
     * Gets the list of group rows.
     * @example
     * ```typescript
     * const groupList = this.grid.groupsRowList;
     * ```
     */
    public get groupsRowList() {
        const res = new QueryList<any>();
        if (!this._groupsRowList) {
            return res;
        }
        const rList = this._groupsRowList.filter((item) => {
            return item.element.nativeElement.parentElement !== null;
        }).sort((item1, item2) => item1.index - item2.index);
        res.reset(rList);
        return res;
    }

    /**
     * @hidden @internal
     */
    @ViewChild('groupArea')
    public groupArea: ElementRef;
    /**
     * @hidden @internal
     */
    @ViewChild('record_template', { read: TemplateRef, static: true })
    protected recordTemplate: TemplateRef<any>;

    @ViewChild('detail_template_container', { read: TemplateRef, static: true })
    protected detailTemplateContainer: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ContentChild(IgxGridDetailTemplateDirective, { read: TemplateRef, static: false })
    public detailTemplate: TemplateRef<any> = null;

    @ViewChild('group_template', { read: TemplateRef, static: true })
    protected defaultGroupTemplate: TemplateRef<any>;

    @ViewChild('summary_template', { read: TemplateRef, static: true })
    protected summaryTemplate: TemplateRef<any>;




    /**
     * @hidden @internal
     */
    @Output()
    private _focusIn = new  EventEmitter<any>();
    @HostListener('focusin') onFocusIn() {
        this._focusIn.emit();
    }

    /**
     * @hidden @internal
     */
    public getDetailsContext(rowData, index) {
        return {
            $implicit: rowData,
            index: index
        };
    }

    /**
     * @hidden @internal
     */
    public preventContainerScroll(evt) {
        if (evt.target.scrollTop !== 0 && this.hasDetails) {
            const activeElem = document.activeElement;
            this.verticalScrollContainer.addScrollTop(evt.target.scrollTop);
            evt.target.scrollTop = 0;
            this.verticalScrollContainer.onChunkLoad.pipe(first()).subscribe(() => {
                const active = this.selectionService.activeElement;
                const currRow = (this.navigation as any).getRowByIndex(active.row, '');
                // check if the focused element was a child of the details view
                if (this.isDetailRecord(active.row) && currRow && currRow.contains(activeElem)) {
                    // Some browsers (like Edge/IE) lose focus after scrolling even when the element was in the DOM.
                    (activeElem as any).focus({ preventScroll: true });
                    return;
                }
                const nextCellTarget = this.navigation.getCellElementByVisibleIndex(active.row, active.column);
                const nextRowTarget = (this.navigation as any).getRowByIndex(active.row + 1, '');
                if (nextCellTarget) {
                    nextCellTarget.focus({ preventScroll: true });
                } else if (nextRowTarget) {
                    nextRowTarget.focus({ preventScroll: true });
                }
            });
        }
    }

    /**
     * @hidden @internal
     */
    public trackChanges(index, rec) {
        if (rec.detailsData !== undefined) {
            return rec.detailsData;
        }
        return rec;
    }

    /**
     * @hidden @internal
     */
    public detailsViewFocused(container, rowIndex) {
        this.selectionService.activeElement = {
            row: rowIndex,
            column: this.selectionService.activeElement ? this.selectionService.activeElement.column : 0
        };
    }

    /**
     * @hidden @internal
     */
    public detailsKeyboardHandler(event, rowIndex, container) {
        const colIndex = this.selectionService.activeElement ? this.selectionService.activeElement.column : 0;
        const shift = event.shiftKey;
        const ctrl = event.ctrlKey;
        const key = event.key.toLowerCase();
        const target = event.target;
        if (key === 'tab') {
            event.stopPropagation();
            const lastColIndex = this.unpinnedColumns[this.unpinnedColumns.length - 1].visibleIndex;
            if (shift && target === container) {
                // shift + tab from details to data row
                event.preventDefault();
                this.navigateTo(rowIndex - 1, lastColIndex,
                    (args) => args.target.nativeElement.focus());
            } else if (!shift) {
                // when the next element is focused via tab check if it is an element outside the details view
                // if so we have exited the details view and focus should move to the first cell in the next row
                this._focusIn.pipe(first()).subscribe(() => {
                    if (!container.contains(document.activeElement)) {
                      this.navigation.performTab(container, {row: rowIndex, column: lastColIndex});
                    }
                });
            }
        } else if (key === 'arrowup' && !ctrl && target === container) {
            this.navigation.navigateUp(container, {row: rowIndex, column: colIndex});
        } else if (key === 'arrowup' && ctrl && target === container) {
            this.navigation.navigateTop(colIndex);
        } else if (key === 'arrowdown' && !ctrl && target === container) {
            this.navigation.navigateDown(container, {row: rowIndex, column: colIndex});
        } else if (key === 'arrowdown' && ctrl && target === container) {
            this.navigation.navigateBottom(colIndex);
        }
    }


    /**
     * @hidden @internal
     */
    public get hasDetails() {
        return !!this.gridDetailsTemplate;
    }

    /**
     * @hidden @internal
     */
   public getRowTemplate(rowData) {
        if (this.isGroupByRecord(rowData)) {
            return this.defaultGroupTemplate;
        } else if (this.isSummaryRow(rowData)) {
            return this.summaryTemplate;
        }  else if (this.hasDetails && this.isDetailRecord(rowData)) {
                return this.detailTemplateContainer;
        } else {
            return this.recordTemplate;
        }
   }

    /**
     * @hidden @internal
     */
   public isDetailRecord(record) {
    return record.detailsData !== undefined;
   }
    /**
     * @hidden @internal
     */
    get groupAreaHostClass(): string {
        return this.getComponentDensityClass('igx-drop-area');
    }

    /**
     * Gets/Sets the template reference for the group row.
     * @example
     * ```
     * const groupRowTemplate = this.grid.groupRowTemplate;
     * this.grid.groupRowTemplate = myRowTemplate;
     * ```
     */
    get groupRowTemplate(): TemplateRef<any> {
        return this._groupRowTemplate;
    }

    set groupRowTemplate(template: TemplateRef<any>) {
        this._groupRowTemplate = template;
        this.notifyChanges();
    }


    /**
     * Gets/Sets the template reference of the `IgxGridComponent`'s group area.
     * @example
     * ```typescript
     * const groupAreaTemplate = this.grid.groupAreaTemplate;
     * this.grid.groupAreaTemplate = myAreaTemplate.
     * ```
     */
    get groupAreaTemplate(): TemplateRef<any> {
        return this._groupAreaTemplate;
    }

    set groupAreaTemplate(template: TemplateRef<any>) {
        this._groupAreaTemplate = template;
        this.notifyChanges();
    }

    /**
     * Groups by a new `IgxColumnComponent` based on the provided expression, or modifies an existing one.
     * @remarks
     * Also allows for multiple columns to be grouped at once if an array of `ISortingExpression` is passed.
     * The onGroupingDone event would get raised only **once** if this method gets called multiple times with the same arguments.
     * @example
     * ```typescript
     * this.grid.groupBy({ fieldName: name, dir: SortingDirection.Asc, ignoreCase: false });
     * this.grid.groupBy([
     *     { fieldName: name1, dir: SortingDirection.Asc, ignoreCase: false },
     *     { fieldName: name2, dir: SortingDirection.Desc, ignoreCase: true },
     *     { fieldName: name3, dir: SortingDirection.Desc, ignoreCase: false }
     * ]);
     * ```
     */
    public groupBy(expression: IGroupingExpression | Array<IGroupingExpression>): void {
        if (this.checkIfNoColumnField(expression)) {
            return;
        }
        this.endEdit(true);
        if (expression instanceof Array) {
            this._gridAPI.groupBy_multiple(expression);
        } else {
            this._gridAPI.groupBy(expression);
        }
        this.notifyChanges(true);
    }

    /**
     * Clears grouping for particular column, array of columns or all columns.
     * @remarks
     * Clears all grouping in the grid, if no parameter is passed.
     * If a parameter is provided, clears grouping for a particular column or an array of columns.
     * @example
     * ```typescript
     * this.grid.clearGrouping(); //clears all grouping
     * this.grid.clearGrouping("ID"); //ungroups a single column
     * this.grid.clearGrouping(["ID", "Column1", "Column2"]); //ungroups multiple columns
     * ```
     * @param name Name of column or array of column names to be ungrouped.
     */
    public clearGrouping(name?: string | Array<string>): void {
        this._gridAPI.clear_groupby(name);
        this.notifyChanges(true);
    }

    /**
     * Returns if a group is expanded or not.
     * @param group The group record.
     * @example
     * ```typescript
     * public groupRow: IGroupByRecord;
     * const expandedGroup = this.grid.isExpandedGroup(this.groupRow);
     * ```
     */
    public isExpandedGroup(group: IGroupByRecord): boolean {
        const state: IGroupByExpandState = this._getStateForGroupRow(group);
        return state ? state.expanded : this.groupsExpanded;
    }

    /**
     * Toggles the expansion state of a group.
     * @param groupRow The group record to toggle.
     * @example
     * ```typescript
     * public groupRow: IGroupByRecord;
     * const toggleExpGroup = this.grid.toggleGroup(this.groupRow);
     * ```
     */
    public toggleGroup(groupRow: IGroupByRecord) {
        this._toggleGroup(groupRow);
        this.notifyChanges();
    }

    /**
     * Expands the specified group and all of its parent groups.
     * @param groupRow The group record to fully expand.
     * @example
     * ```typescript
     * public groupRow: IGroupByRecord;
     * this.grid.fullyExpandGroup(this.groupRow);
     * ```
     */
    public fullyExpandGroup(groupRow: IGroupByRecord) {
        this._fullyExpandGroup(groupRow);
        this.notifyChanges();
    }

    /**
     * @hidden @internal
     */
    public isGroupByRecord(record: any): boolean {
        // return record.records instance of GroupedRecords fails under Webpack
        return record.records && record.records.length;
    }

    /**
     * Toggles the expansion state of all group rows recursively.
     * @example
     * ```typescript
     * this.grid.toggleAllGroupRows;
     * ```
     */
    public toggleAllGroupRows() {
        this.groupingExpansionState = [];
        this.groupsExpanded = !this.groupsExpanded;
        this.notifyChanges();
    }

    /**
     * Returns if the `IgxGridComponent` has groupable columns.
     * @example
     * ```typescript
     * const groupableGrid = this.grid.hasGroupableColumns;
     * ```
     */
    get hasGroupableColumns(): boolean {
        return this.columnList.some((col) => col.groupable && !col.columnGroup);
    }

    private _setGroupColsVisibility(value) {
        if (this.columnList.length > 0 && !this.hasColumnLayouts) {
            this.groupingExpressions.forEach((expr) => {
                const col = this.getColumnByName(expr.fieldName);
                col.hidden = value;
            });
        }
    }

    /**
     * Gets if the grid's group by drop area is visible.
     * @example
     * ```typescript
     * const dropVisible = this.grid.dropAreaVisible;
     * ```
     */
    public get dropAreaVisible(): boolean {
        return (this.draggedColumn && this.draggedColumn.groupable) ||
            !this.chipsGoupingExpressions.length;
    }

    /**
     * @hidden @internal
     */
    protected _getStateForGroupRow(groupRow: IGroupByRecord): IGroupByExpandState {
        return this._gridAPI.groupBy_get_expanded_for_group(groupRow);
    }

    /**
     * @hidden
     */
    protected _toggleGroup(groupRow: IGroupByRecord) {
        this._gridAPI.groupBy_toggle_group(groupRow);
    }

    /**
     * @hidden @internal
     */
    protected _fullyExpandGroup(groupRow: IGroupByRecord) {
        this._gridAPI.groupBy_fully_expand_group(groupRow);
    }

    /**
     * @hidden @internal
     */
    protected _applyGrouping() {
        this._gridAPI.sort_multiple(this._groupingExpressions);
    }

    /**
     * @hidden @internal
     */
    public isColumnGrouped(fieldName: string): boolean {
        return this.groupingExpressions.find(exp => exp.fieldName === fieldName) ? true : false;
    }

    /**
     * @hidden @internal
     */
    public getContext(rowData: any, rowIndex: number, pinned?: boolean): any {
        if (pinned && !this.isRowPinningToTop) {
            rowIndex = rowIndex + this.dataView.length;
        }
        rowIndex = !pinned && this.isRowPinningToTop ? rowIndex + this._pinnedRecordIDs.length : rowIndex;
        if (this.isDetailRecord(rowData)) {
            const cachedData = this.childDetailTemplates.get(rowData.detailsData);
            const rowID = this.primaryKey ? rowData.detailsData[this.primaryKey] : this.data.indexOf(rowData.detailsData);
            if (cachedData) {
                const view = cachedData.view;
                const tmlpOutlet = cachedData.owner;
                return {
                    $implicit: rowData.detailsData,
                    moveView: view,
                    owner: tmlpOutlet,
                    index: this.dataView.indexOf(rowData),
                    templateID: 'detailRow-' + rowID
                };
            } else {
                // child rows contain unique grids, hence should have unique templates
                return {
                    $implicit: rowData.detailsData,
                    templateID: 'detailRow-' + rowID,
                    index: this.dataView.indexOf(rowData)
                };
            }
        }
        return {
            $implicit: rowData,
            index: rowIndex,
            templateID: this.isGroupByRecord(rowData) ? 'groupRow' : this.isSummaryRow(rowData) ? 'summaryRow' : 'dataRow'
        };
    }

    /**
     * @hidden @internal
     */
    public viewCreatedHandler(args) {
        if (args.context.templateID.indexOf('detailRow') !== -1) {
            this.childDetailTemplates.set(args.context.$implicit, args);
        }
    }

    /**
     * @hidden @internal
     */
    public viewMovedHandler(args) {
        if (args.context.templateID.indexOf('detailRow') !== -1) {
            // view was moved, update owner in cache
            const key = args.context.$implicit;
            const cachedData = this.childDetailTemplates.get(key);
            cachedData.owner = args.owner;
        }
    }


    /**
     * @hidden @internal
     */
    public get template(): TemplateRef<any> {
        if (this.filteredData && this.filteredData.length === 0) {
            return this.emptyGridTemplate ? this.emptyGridTemplate : this.emptyFilteredGridTemplate;
        }

        if (this.isLoading && (!this.data || this.dataLength === 0)) {
            return this.loadingGridTemplate ? this.loadingGridTemplate : this.loadingGridDefaultTemplate;
        }

        if (this.dataLength === 0) {
            return this.emptyGridTemplate ? this.emptyGridTemplate : this.emptyGridDefaultTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    public onChipRemoved(event: IBaseChipEventArgs) {
        this.clearGrouping(event.owner.id);
    }

    /**
     * @hidden @internal
     */
    public chipsOrderChanged(event: IChipsAreaReorderEventArgs) {
        const newGrouping = [];
        for (let i = 0; i < event.chipsArray.length; i++) {
            const expr = this.groupingExpressions.filter((item) => {
                return item.fieldName === event.chipsArray[i].id;
            })[0];

            if (!this.getColumnByName(expr.fieldName).groupable) {
                // disallow changing order if there are columns with groupable: false
                return;
            }
            newGrouping.push(expr);
        }
        this.groupingExpansionState = [];
        this.chipsGoupingExpressions = newGrouping;

        if (event.originalEvent instanceof KeyboardEvent) {
            // When reordered using keyboard navigation, we don't have `onMoveEnd` event.
            this.groupingExpressions = this.chipsGoupingExpressions;
        }
        this.notifyChanges();
    }

    /**
     * @hidden @internal
     */
    public chipsMovingEnded() {
        this.groupingExpressions = this.chipsGoupingExpressions;
        this.notifyChanges();
    }

    /**
     * @hidden @internal
     */
    public onChipClicked(event: IChipClickEventArgs) {
        const sortingExpr = this.sortingExpressions;
        const columnExpr = sortingExpr.find((expr) => expr.fieldName === event.owner.id);
        columnExpr.dir = 3 - columnExpr.dir;
        this.sort(columnExpr);
        this.notifyChanges();
    }

    /**
     * @hidden @internal
     */
    public onChipKeyDown(event: IChipKeyDownEventArgs) {
        if (event.originalEvent.key === ' ' || event.originalEvent.key === 'Spacebar' || event.originalEvent.key === 'Enter') {
            const sortingExpr = this.sortingExpressions;
            const columnExpr = sortingExpr.find((expr) => expr.fieldName === event.owner.id);
            columnExpr.dir = 3 - columnExpr.dir;
            this.sort(columnExpr);
            this.notifyChanges();
        }
    }

    /**
     * @hidden @internal
     */
    protected get defaultTargetBodyHeight(): number {
        const allItems = this.totalItemCount || this.dataLength;
        return this.renderedRowHeight * Math.min(this._defaultTargetRecordNumber,
            this.paging ? Math.min(allItems, this.perPage) : allItems);
    }

    /**
     * @hidden @internal
     */
    protected getGroupAreaHeight(): number {
        return this.groupArea ? this.groupArea.nativeElement.offsetHeight : 0;
    }

    /**
     * @hidden @internal
     */
    protected scrollTo(row: any | number, column: any | number): void {
        if (this.groupingExpressions && this.groupingExpressions.length
            && typeof(row) !== 'number') {
            const rowIndex = this.groupingResult.indexOf(row);
            const groupByRecord = this.groupingMetadata[rowIndex];
            if (groupByRecord) {
                this._fullyExpandGroup(groupByRecord);
            }
        }

        super.scrollTo(row, column, this.groupingFlatResult);
    }

    /**
     * @hidden @internal
     */
    public get dropAreaTemplateResolved(): TemplateRef<any> {
        if (this.dropAreaTemplate) {
            return this.dropAreaTemplate;
        } else {
            return this.defaultDropAreaTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    public getGroupByChipTitle(expression: IGroupingExpression): string {
        const column = this.getColumnByName(expression.fieldName);
        return (column && column.header) || expression.fieldName;
    }
    /**
     * @hidden @internal
     */
    public get iconTemplate() {
        if (this.groupsExpanded) {
            return this.headerExpandIndicatorTemplate || this.defaultExpandedTemplate;
        } else {
            return this.headerCollapseIndicatorTemplate || this.defaultCollapsedTemplate;
        }
    }

    /**
     * @hidden @internal
     */
    public getColumnGroupable(fieldName: string): boolean {
        const column = this.getColumnByName(fieldName);
        return column && column.groupable;
    }

    /**
     * @hidden @internal
     */
    public ngAfterContentInit() {
        super.ngAfterContentInit();
        if (this.allowFiltering && this.hasColumnLayouts) {
            this.filterMode = FilterMode.excelStyleFilter;
        }
        if (this.groupTemplate) {
            this._groupRowTemplate = this.groupTemplate.template;
        }

        if (this.hideGroupedColumns && this.columnList && this.groupingExpressions) {
            this._setGroupColsVisibility(this.hideGroupedColumns);
        }
        this._setupNavigationService();
    }

    /**
     * @hidden @internal
     */
    public ngAfterViewInit() {
        super.ngAfterViewInit();
        this.verticalScrollContainer.onBeforeViewDestroyed.pipe(takeUntil(this.destroy$)).subscribe((view) => {
            const rowData = view.context.$implicit;
            if (this.isDetailRecord(rowData)) {
                const cachedData = this.childDetailTemplates.get(rowData.detailsData);
                if (cachedData) {
                    const tmlpOutlet = cachedData.owner;
                    tmlpOutlet._viewContainerRef.detach(0);
                }
            }
        });
    }

    /**
     * @hidden @internal
     */
    public ngOnInit() {
        super.ngOnInit();
        this.onGroupingDone.pipe(takeUntil(this.destroy$)).subscribe((args) => {
            this.endEdit(true);
            this.summaryService.updateSummaryCache(args);
            this._headerFeaturesWidth = NaN;
        });
    }

    /**
     * @hidden @internal
     */
    public ngDoCheck(): void {
        if (this.groupingDiffer && this.columnList && !this.hasColumnLayouts) {
            const changes = this.groupingDiffer.diff(this.groupingExpressions);
            if (changes && this.columnList.length > 0) {
                changes.forEachAddedItem((rec) => {
                    const col = this.getColumnByName(rec.item.fieldName);
                    col.hidden = true;
                });
                changes.forEachRemovedItem((rec) => {
                    const col = this.getColumnByName(rec.item.fieldName);
                    col.hidden = false;
                });
            }
        }
        super.ngDoCheck();
    }

    /**
     * @inheritdoc
     */
    getSelectedData(formatters = false, headers = false): any[] {
        if (this.groupingExpressions.length) {
            const source = [];

            const process = (record) => {
                if (record.expression || record.summaries) {
                    source.push(null);
                    return;
                }
                source.push(record);

            };

            this.dataView.forEach(process);
            return this.extractDataFromSelection(source, formatters, headers);
        } else {
            return super.getSelectedData(formatters, headers);
        }
    }

    private _setupNavigationService() {
        if (this.hasColumnLayouts) {
            this.navigation = new IgxGridMRLNavigationService();
            this.navigation.grid = this;
        }
    }

    private checkIfNoColumnField(expression: IGroupingExpression | Array<IGroupingExpression> | any): boolean {
        if (expression instanceof Array) {
            for (const singleExpression of expression) {
                if (!singleExpression.fieldName) {
                    return true;
                }
            }
            return false;
        }
        return !expression.fieldName;
    }

}
