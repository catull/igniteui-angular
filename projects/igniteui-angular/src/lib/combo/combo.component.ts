import { ConnectedPositioningStrategy } from './../services/overlay/position/connected-positioning-strategy';
import { CommonModule } from '@angular/common';
import {
    AfterViewInit, ChangeDetectorRef, Component, ContentChild, ElementRef, EventEmitter, HostBinding, HostListener,
    Input, NgModule, OnInit, OnDestroy, Output, TemplateRef, ViewChild, Optional, Inject, Injector, Type
} from '@angular/core';
import {
    IgxComboItemDirective,
    IgxComboEmptyDirective,
    IgxComboHeaderItemDirective,
    IgxComboHeaderDirective,
    IgxComboFooterDirective,
    IgxComboAddItemDirective,
    IgxComboToggleIconDirective,
    IgxComboClearIconDirective
} from './combo.directives';
import { FormsModule, ReactiveFormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, AbstractControl } from '@angular/forms';
import { IgxCheckboxModule } from '../checkbox/checkbox.component';
import { IgxSelectionAPIService } from '../core/selection';
import { cloneArray, CancelableEventArgs, CancelableBrowserEventArgs, IBaseEventArgs } from '../core/utils';
import { IgxStringFilteringOperand, IgxBooleanFilteringOperand } from '../data-operations/filtering-condition';
import { FilteringLogic } from '../data-operations/filtering-expression.interface';
import { IgxForOfModule, IForOfState, IgxForOfDirective } from '../directives/for-of/for_of.directive';
import { IgxIconModule } from '../icon/index';
import { IgxRippleModule } from '../directives/ripple/ripple.directive';
import { IgxToggleModule } from '../directives/toggle/toggle.directive';
import { IgxButtonModule } from '../directives/button/button.directive';
import { IgxDropDownModule } from '../drop-down/index';
import { IgxInputGroupModule, IgxInputGroupComponent } from '../input-group/input-group.component';
import { IgxComboItemComponent } from './combo-item.component';
import { IgxComboDropDownComponent } from './combo-dropdown.component';
import { IgxComboFilteringPipe, IgxComboGroupingPipe } from './combo.pipes';
import { OverlaySettings, AbsoluteScrollStrategy } from '../services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DisplayDensityBase, DisplayDensityToken, IDisplayDensityOptions } from '../core/density';
import { IGX_COMBO_COMPONENT, IgxComboBase } from './combo.common';
import { IgxComboAddItemComponent } from './combo-add-item.component';
import { IgxComboAPIService } from './combo.api';
import { EditorProvider } from '../core/edit-provider';
import { IgxInputState, IgxInputDirective } from '../directives/input/input.directive';

/**
 * @hidden
 */
enum DataTypes {
    EMPTY = 'empty',
    PRIMITIVE = 'primitive',
    COMPLEX = 'complex',
    PRIMARYKEY = 'valueKey'
}

/**
 * @hidden
 */
const ItemHeights = {
    'comfortable': 40,
    'cosy': 32,
    'compact': 28,
};

/**
 * @hidden
 * The default number of items that should be in the combo's
 * drop-down list if no `[itemsMaxHeight]` is specified
 */
const itemsInContainer = 10;

export enum IgxComboState {
    /**
     * Combo with initial state.
     */
    INITIAL = IgxInputState.INITIAL,
    /**
     * Combo with valid state.
     */
    VALID = IgxInputState.VALID,
    /**
     * Combo with invalid state.
     */
    INVALID = IgxInputState.INVALID
}

/** Event emitted when an igx-combo's selection is changing */
export interface IComboSelectionChangeEventArgs extends CancelableEventArgs, IBaseEventArgs {
    /** An array containing the values that are currently selected */
    oldSelection: any[];
    /** An array containing the values that will be selected after this event */
    newSelection: any[];
    /** An array containing the values that will be added to the selection (if any) */
    added: any[];
    /** An array containing the values that will be removed from the selection (if any) */
    removed: any[];
    /** The text displayed in the combo text box */
    textValue: string;
    /** The user interaction that triggered the selection change */
    event?: Event;
}

export interface IComboItemAdditionEvent extends IBaseEventArgs {
    oldCollection: any[];
    addedItem: any;
    newCollection: any[];
}

/**
 * When called with sets A & B, returns A - B (as array);
 * @hidden
 */
function diffInSets(set1: Set<any>, set2: Set<any>): any[] {
    const results = [];
    set1.forEach(entry => {
        if (!set2.has(entry)) {
            results.push(entry);
        }
    });
    return results;
}

let NEXT_ID = 0;
const noop = () => { };

@Component({
    selector: 'igx-combo',
    templateUrl: 'combo.component.html',
    providers: [
        IgxComboAPIService,
        { provide: IGX_COMBO_COMPONENT, useExisting: IgxComboComponent },
        { provide: NG_VALUE_ACCESSOR, useExisting: IgxComboComponent, multi: true }
    ]
})
export class IgxComboComponent extends DisplayDensityBase implements IgxComboBase, AfterViewInit, ControlValueAccessor, OnInit,
    OnDestroy, EditorProvider {
    /**
     * @hidden @internal
     */
    public customValueFlag = true;
    /**
     * @hidden @internal
     */
    public defaultFallbackGroup = 'Other';
    protected stringFilters = IgxStringFilteringOperand;
    protected booleanFilters = IgxBooleanFilteringOperand;
    protected _groupKey = '';
    protected _displayKey: string;
    protected _prevInputValue = '';
    private _dataType = '';
    private ngControl: NgControl = null;
    private destroy$ = new Subject<any>();
    private _data = [];
    private _filteredData = [];
    private _itemHeight = null;
    private _itemsMaxHeight = null;
    private _remoteSelection = {};
    private _onChangeCallback: (_: any) => void = noop;
    private _overlaySettings: OverlaySettings = {
        scrollStrategy: new AbsoluteScrollStrategy(),
        positionStrategy: new ConnectedPositioningStrategy(),
        modal: false,
        closeOnOutsideClick: true,
        excludePositionTarget: true
    };
    private _value = '';
    private _valid = IgxComboState.INITIAL;
    constructor(
        protected elementRef: ElementRef,
        protected cdr: ChangeDetectorRef,
        protected selection: IgxSelectionAPIService,
        protected comboAPI: IgxComboAPIService,
        @Optional() @Inject(DisplayDensityToken) protected _displayDensityOptions: IDisplayDensityOptions,
        @Optional() private _injector: Injector) {
        super(_displayDensityOptions);
        this.comboAPI.register(this);
    }

    @ViewChild(IgxForOfDirective, { read: IgxForOfDirective, static: true })
    protected virtDir: IgxForOfDirective<any>;

    /**
     * Set custom overlay settings that control how the combo's list of items is displayed.
     * Set:
     * ```html
     * <igx-combo [overlaySettings] = "customOverlaySettings"></igx-combo>
     * ```
     *
     * ```typescript
     *  const customSettings = { positionStrategy: { settings: { target: myTarget } } };
     *  combo.overlaySettings = customSettings;
     * ```
     * Get any custom overlay settings used by the combo:
     * ```typescript
     *  const comboOverlaySettings: OverlaySettings = myCombo.overlaySettings;
     * ```
     */

    @Input()
    public overlaySettings: OverlaySettings = null;

    /** @hidden @internal */
    @ViewChild('inputGroup', { read: IgxInputGroupComponent, static: true }) public inputGroup: IgxInputGroupComponent;

    /** @hidden @internal */
    @ViewChild('comboInput', { read: IgxInputDirective, static: true }) public comboInput: IgxInputDirective;

    /**
     * @hidden @internal
     */
    @ViewChild(IgxComboDropDownComponent, { read: IgxComboDropDownComponent, static: true })
    public dropdown: IgxComboDropDownComponent;

    /**
     * @hidden @internal
     */
    @ViewChild('searchInput')
    public searchInput: ElementRef<HTMLInputElement> = null;

    /**
     * @hidden @internal
     */
    get displaySearchInput(): boolean {
        return this.filterable || this.allowCustomValues;
    }

    /**
     * The custom template, if any, that should be used when rendering ITEMS in the combo list
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.itemTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboItem>
     *          <div class="custom-item" let-item let-key="valueKey">
     *              <div class="custom-item__name">{{ item[key] }}</div>
     *              <div class="custom-item__cost">{{ item.cost }}</div>
     *          </div>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboItemDirective, { read: TemplateRef })
    public itemTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the HEADER for the combo items list
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.headerTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboHeader>
     *          <div class="combo__header">
     *              This is a custom header
     *          </div>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboHeaderDirective, { read: TemplateRef })
    public headerTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the FOOTER for the combo items list
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.footerTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboFooter>
     *          <div class="combo__footer">
     *              This is a custom footer
     *          </div>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboFooterDirective, { read: TemplateRef })
    public footerTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering HEADER ITEMS for groups in the combo list
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.headerItemTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboHeaderItem let-item let-key="groupKey">
     *          <div class="custom-item--group">Group header for {{ item[key] }}</div>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboHeaderItemDirective, { read: TemplateRef })
    public headerItemTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the ADD BUTTON in the combo drop down
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.addItemTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboAddItem>
     *          <button class="combo__add-button">
     *              Click to add item
     *          </button>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboAddItemDirective, { read: TemplateRef })
    public addItemTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the ADD BUTTON in the combo drop down
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.emptyTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboEmpty>
     *          <div class="combo--empty">
     *              There are no items to display
     *          </div>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboEmptyDirective, { read: TemplateRef })
    public emptyTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the combo TOGGLE(open/close) button
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.toggleIconTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboToggleIcon let-collapsed>
     *          <igx-icon>{{ collapsed ? 'remove_circle' : 'remove_circle_outline'}}</igx-icon>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboToggleIconDirective, { read: TemplateRef })
    public toggleIconTemplate: TemplateRef<any> = null;

    /**
     * The custom template, if any, that should be used when rendering the combo CLEAR button
     *
     * ```typescript
     * // Set in typescript
     * const myCustomTemplate: TemplateRef<any> = myComponent.customTemplate;
     * myComponent.combo.clearIconTemplate = myCustomTemplate;
     * ```
     * ```html
     * <!-- Set in markup -->
     *  <igx-combo #combo>
     *      ...
     *      <ng-template igxComboClearIcon>
     *          <igx-icon>clear</igx-icon>
     *      </ng-template>
     *  </igx-combo>
     * ```
     */
    @ContentChild(IgxComboClearIconDirective, { read: TemplateRef })
    public clearIconTemplate: TemplateRef<any> = null;

    @ViewChild('primitive', { read: TemplateRef, static: true })
    protected primitiveTemplate: TemplateRef<any>;

    @ViewChild('complex', { read: TemplateRef, static: true })
    protected complexTemplate: TemplateRef<any>;

    /**
     * @hidden @internal
     */
    @ViewChild(IgxForOfDirective, { static: true })
    public virtualScrollContainer: IgxForOfDirective<any>;

    @ViewChild('dropdownItemContainer', { static: true })
    protected dropdownContainer: ElementRef = null;

    /**
     * Emitted when item selection is changing, before the selection completes
     *
     * ```html
     * <igx-combo (onSelectionChange)='handleSelection()'></igx-combo>
     * ```
     */
    @Output()
    public onSelectionChange = new EventEmitter<IComboSelectionChangeEventArgs>();

    /**
     * Emitted before the dropdown is opened
     *
     * ```html
     * <igx-combo onOpening='handleOpening($event)'></igx-combo>
     * ```
     */
    @Output()
    public onOpening = new EventEmitter<CancelableEventArgs & IBaseEventArgs>();

    /**
     * Emitted after the dropdown is opened
     *
     * ```html
     * <igx-combo (onOpened)='handleOpened()'></igx-combo>
     * ```
     */
    @Output()
    public onOpened = new EventEmitter<void>();

    /**
     * Emitted before the dropdown is closed
     *
     * ```html
     * <igx-combo (onClosing)='handleClosing($event)'></igx-combo>
     * ```
     */
    @Output()
    public onClosing = new EventEmitter<CancelableBrowserEventArgs & IBaseEventArgs>();

    /**
     * Emitted after the dropdown is closed
     *
     * ```html
     * <igx-combo (onClosed)='handleClosed()'></igx-combo>
     * ```
     */
    @Output()
    public onClosed = new EventEmitter<void>();

    /**
     * Emitted when an item is being added to the data collection
     *
     * ```html
     * <igx-combo (onAddition)='handleAdditionEvent()'></igx-combo>
     * ```
     */
    @Output()
    public onAddition = new EventEmitter<IComboItemAdditionEvent>();

    /**
     * Emitted when the value of the search input changes (e.g. typing, pasting, clear, etc.)
     *
     * ```html
     * <igx-combo (onSearchInput)='handleSearchInputEvent()'></igx-combo>
     * ```
     */
    @Output()
    public onSearchInput = new EventEmitter();

    /**
     * Emitted when new chunk of data is loaded from the virtualization
     *
     * ```html
     * <igx-combo (onDataPreLoad)='handleDataPreloadEvent()'></igx-combo>
     * ```
     */
    @Output()
    public onDataPreLoad = new EventEmitter<any>();

    /**
     * Gets/gets combo id.
     *
     * ```typescript
     * // get
     * let id = this.combo.id;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [id]='combo1'></igx-combo>
     * ```
    */
    @HostBinding('attr.id')
    @Input()
    public id = `igx-combo-${NEXT_ID++}`;

    /**
     * Sets the style width of the element
     *
     * ```typescript
     * // get
     * let myComboWidth = this.combo.width;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [width]='250px'></igx-combo>
     * ```
     */
    @HostBinding('style.width')
    @Input()
    public width: string;

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-combo')
    public cssClass = 'igx-combo'; // Independent of display density, at the time being

    /**
     * @hidden @internal
     */
    @HostBinding(`attr.role`)
    public role = 'combobox';

    /**
     * @hidden @internal
     */
    @HostBinding('attr.aria-expanded')
    public get ariaExpanded(): boolean {
        return !this.dropdown.collapsed;
    }

    /**
     * @hidden @internal
     */
    @HostBinding('attr.aria-haspopup')
    public get hasPopUp() {
        return 'listbox';
    }

    /**
     * @hidden @internal
     */
    @HostBinding('attr.aria-owns')
    public get ariaOwns() {
        return this.dropdown.id;
    }

    /**
     * Controls whether custom values can be added to the collection
     *
     * ```typescript
     * // get
     * let comboAllowsCustomValues = this.combo.allowCustomValues;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [allowCustomValues]='true'></igx-combo>
     * ```
     */
    @Input()
    public allowCustomValues = false;

    /**
     * Configures the drop down list height
     *
     * ```typescript
     * // get
     * let myComboItemsMaxHeight = this.combo.itemsMaxHeight;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [itemsMaxHeight]='320'></igx-combo>
     * ```
    */
    @Input()
    public get itemsMaxHeight(): number {
        if (this._itemsMaxHeight === null || this._itemsMaxHeight === undefined) {
            return this.itemHeight * itemsInContainer;
        }
        return this._itemsMaxHeight;
    }

    public set itemsMaxHeight(val: number) {
        this._itemsMaxHeight = val;
    }

    /**
     * Configures the drop down list width
     *
     * ```typescript
     * // get
     * let myComboItemsWidth = this.combo.itemsWidth;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [itemsWidth] = '"180px"'></igx-combo>
     * ```
     */
    @Input()
    public itemsWidth: string;

    /**
     * Configures the drop down list item height
     *
     * ```typescript
     * // get
     * let myComboItemHeight = this.combo.itemHeight;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [itemHeight]='32'></igx-combo>
     * ```
     */
    @Input()
    public get itemHeight(): number {
        if (this._itemHeight === null || this._itemHeight === undefined) {
            return ItemHeights[this.displayDensity];
        }
        return this._itemHeight;
    }

    public set itemHeight(val: number) {
        this._itemHeight = val;
    }

    /**
     * @hidden @internal
     */
    public filteringLogic = FilteringLogic.Or;

    /**
     * Defines the placeholder value for the combo value field
     *
     * ```typescript
     * // get
     * let myComboPlaceholder = this.combo.placeholder;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [placeholder]='newPlaceHolder'></igx-combo>
     * ```
     */
    @Input()
    public placeholder;

    /**
     * @hidden @internal
     */
    public get inputEmpty(): boolean {
        return !this.value && !this.placeholder;
    }

    /**
     * Defines the placeholder value for the combo dropdown search field
     *
     * ```typescript
     * // get
     * let myComboSearchPlaceholder = this.combo.searchPlaceholder;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [searchPlaceholder]='newPlaceHolder'></igx-combo>
     * ```
     */
    @Input()
    public searchPlaceholder = 'Enter a Search Term';

    /**
     * Combo data source.
     *
     * ```html
     * <!--set-->
     * <igx-combo [data]='items'></igx-combo>
     * ```
     */
    @Input()
    get data(): any[] {
        return this._data;
    }
    set data(val: any[]) {
        this._data = (val) ? val : [];
    }

    /**
     * Combo value data source property.
     *
     * ```typescript
     * // get
     * let myComboValueKey = this.combo.valueKey;
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [valueKey]='myKey'></igx-combo>
     * ```
     */
    @Input()
    public valueKey: string = null;

    @Input()
    set displayKey(val: string) {
        this._displayKey = val;
    }

    /**
     * Combo text data source property.
     *
     * ```typescript
     * // get
     * let myComboDisplayKey = this.combo.displayKey;
     *
     * // set
     * this.combo.displayKey = 'val';
     *
     * ```
     *
     * ```html
     * <!--set-->
     * <igx-combo [displayKey]='myDisplayKey'></igx-combo>
     * ```
     */
    get displayKey() {
        return this._displayKey ? this._displayKey : this.valueKey;
    }

    /**
     * The item property by which items should be grouped inside the items list. Not usable if data is not of type Object[].
     *
     * ```html
     * <!--set-->
     * <igx-combo [groupKey]='newGroupKey'></igx-combo>
     * ```
     */
    @Input()
    public set groupKey(val: string) {
        this._groupKey = val;
    }

    /**
     * The item property by which items should be grouped inside the items list. Not usable if data is not of type Object[].
     *
     * ```typescript
     * // get
     * let currentGroupKey = this.combo.groupKey;
     * ```
     */
    public get groupKey(): string {
        return this._groupKey;
    }

    /**
     * An @Input property that enabled/disables filtering in the list. The default is `true`.
     * ```html
     *<igx-combo [filterable]="false">
     * ```
     */
    @Input()
    public filterable = true;

    /**
     * An @Input property that set aria-labelledby attribute
     * ```html
     *<igx-combo [ariaLabelledBy]="'label1'">
     * ```
     */
    @Input()
    @HostBinding('attr.aria-labelledby')
    public ariaLabelledBy: string;

    /**
     * An @Input property that enabled/disables combo. The default is `false`.
     * ```html
     *<igx-combo [disabled]="'true'">
     * ```
     */
    @Input()
    public disabled = false;

    /**
     * An @Input property that sets how the combo will be styled.
     * The allowed values are `line`, `box`, `border` and `search`. The default is `box`.
     * ```html
     *<igx-combo [type]="'line'">
     * ```
     */
    @Input()
    public type = 'box';

    /**
     * Gets if control is valid, when used in a form
     *
     * ```typescript
     * // get
     * let valid = this.combo.valid;
     * ```
     * */
    public get valid(): IgxComboState {
        return this._valid;
    }

    /**
    * Sets if control is valid, when used in a form
    *
    * ```typescript
    * // set
    * this.combo.valid = IgxComboState.INVALID;
    * ```
   */
    public set valid(valid: IgxComboState) {
        this._valid = valid;
        this.comboInput.valid = IgxInputState[IgxComboState[valid]];
    }

    /**
     * @hidden @internal
     */
    public searchValue = '';

    /**
     * @hidden @internal
     */
    @HostListener('keydown.ArrowDown', ['$event'])
    @HostListener('keydown.Alt.ArrowDown', ['$event'])
    onArrowDown(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.open();
    }

    /**
     * @hidden @internal
     */
    onInputClick(event: Event) {
        event.stopPropagation();
        event.preventDefault();
        this.toggle();
    }

    /**
     * Defines the current state of the virtualized data. It contains `startIndex` and `chunkSize`
     *
     * ```typescript
     * // get
     * let state = this.combo.virtualizationState;
     * ```
    */
    get virtualizationState(): IForOfState {
        return this.virtDir.state;
    }
    /**
     * Sets the current state of the virtualized data.
     *
     * ```typescript
     * // set
     * this.combo.virtualizationState(state);
     * ```
     */
    set virtualizationState(state: IForOfState) {
        this.virtDir.state = state;
    }

    /**
     * Gets total count of the virtual data items, when using remote service.
     *
     * ```typescript
     * // get
     * let count = this.combo.totalItemCount;
     * ```
    */
    get totalItemCount(): number {
        return this.virtDir.totalItemCount;
    }
    /**
     * Sets total count of the virtual data items, when using remote service.
     *
     * ```typescript
     * // set
     * this.combo.totalItemCount(remoteService.count);
     * ```
     */
    set totalItemCount(count: number) {
        this.virtDir.totalItemCount = count;
    }

    /**
     * The text displayed in the combo input
     *
     * ```typescript
     * // get
     * let comboValue = this.combo.value;
     * ```
     */
    get value(): string {
        return this._value;
    }

    /**
     * @hidden @internal
     */
    public get filteredData(): any[] {
        return this.filterable ? this._filteredData : this.data;
    }

    /**
     * @hidden @internal
     */
    public set filteredData(val: any[]) {
        this._filteredData = this.groupKey ? (val || []).filter((e) => e.isHeader !== true) : val;
        this.checkMatch();
    }

    /**
     * @hidden @internal
     */
    public handleKeyUp(event: KeyboardEvent): void {
        if (event.key === 'ArrowDown' || event.key === 'Down') {
            this.dropdown.focusedItem = this.dropdown.items[0];
            this.dropdownContainer.nativeElement.focus();
        } else if (event.key === 'Escape' || event.key === 'Esc') {
            this.toggle();
        }
    }

    /**
     * @hidden @internal
     */
    public handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowUp' || event.key === 'Up') {
            event.preventDefault();
            event.stopPropagation();
            this.close();
        }
    }

    private checkMatch(): void {
        const displayKey = this.displayKey;
        const matchFn = (e) => {
            const value = displayKey ? e[displayKey] : e;
            return value.toString().toLowerCase() === this.searchValue.trim().toLowerCase();
        };
        const itemMatch = this.filteredData.some(matchFn);
        this.customValueFlag = this.allowCustomValues && !itemMatch;
    }

    /**
     * @hidden @internal
     */
    public handleInputChange(event?: string) {
        if (event !== undefined) {
            this.onSearchInput.emit(event);
        }
        this.checkMatch();
    }

    /**
     * @hidden @internal
     */
    public get dataType(): string {
        if (this.displayKey) {
            return DataTypes.COMPLEX;
        }
        return DataTypes.PRIMITIVE;
    }

    /**
     * @hidden @internal
     */
    public get isRemote() {
        return this.totalItemCount > 0 &&
            this.valueKey &&
            this.dataType === DataTypes.COMPLEX;
    }

    /** Contains key-value pairs of the selected valueKeys and their resp. displayKeys */
    private registerRemoteEntries(ids: any[], add = true) {
        if (add) {
            const selection = this.getValueDisplayPairs(ids);
            for (const entry of selection) {
                this._remoteSelection[entry[this.valueKey]] = entry[this.displayKey];
            }
        } else {
            for (const entry of ids) {
                delete this._remoteSelection[entry];
            }
        }
    }

    /** For `id: any[]` returns a mapped `{ [combo.valueKey]: any, [combo.displayKey]: any }[]`*/
    private getValueDisplayPairs(ids: any[]) {
        return this.data.filter(entry => ids.indexOf(entry[this.valueKey]) > -1).map(e => {
            return {
                [this.valueKey]: e[this.valueKey],
                [this.displayKey]: e[this.displayKey]
            };
        });
    }

    /**
     * Returns if the specified itemID is selected
     * @hidden
     * @internal
     */
    public isItemSelected(item: any): boolean {
        return this.selection.is_item_selected(this.id, item);
    }

    /**
     * Triggers change detection on the combo view
     */
    public triggerCheck() {
        this.cdr.detectChanges();
    }

    /**
     * @hidden @internal
     */
    public isAddButtonVisible(): boolean {
        // This should always return a boolean value. If this.searchValue was '', it returns '' instead of false;
        return this.searchValue !== '' && this.customValueFlag;
    }

    /**
     * @hidden @internal
     */
    public handleSelectAll(evt) {
        if (evt.checked) {
            this.selectAllItems();
        } else {
            this.deselectAllItems();
        }
    }

    /**
     * @hidden @internal
     */
    public addItemToCollection() {
        if (!this.searchValue) {
            return;
        }
        const newValue = this.searchValue.trim();
        const addedItem = this.displayKey ? {
            [this.valueKey]: newValue,
            [this.displayKey]: newValue
        } : newValue;
        if (this.groupKey) {
            Object.assign(addedItem, { [this.groupKey]: this.defaultFallbackGroup });
        }
        const oldCollection = this.data;
        const newCollection = [...this.data];
        newCollection.push(addedItem);
        const args: IComboItemAdditionEvent = {
            oldCollection, addedItem, newCollection
        };
        this.onAddition.emit(args);
        this.data.push(addedItem);
        // If you mutate the array, no pipe is invoked and the display isn't updated;
        // if you replace the array, the pipe executes and the display is updated.
        this.data = cloneArray(this.data);
        this.selectItems(this.comboAPI.valueKey !== null ? [addedItem[this.valueKey]] : [addedItem], false);
        this.customValueFlag = false;
        this.searchInput.nativeElement.focus();
        this.dropdown.focusedItem = null;
        this.virtDir.scrollTo(0);
    }

    /**
     * @hidden @internal
     */
    public focusSearchInput(opening?: boolean): void {
        if (this.displaySearchInput && this.searchInput) {
            this.searchInput.nativeElement.focus();
        } else {
            if (opening) {
                this.dropdownContainer.nativeElement.focus();
            } else {
                this.comboInput.nativeElement.focus();
                this.toggle();
            }
        }
    }

    protected onStatusChanged = () => {
        if ((this.ngControl.control.touched || this.ngControl.control.dirty) &&
            (this.ngControl.control.validator || this.ngControl.control.asyncValidator)) {
            this.valid = this.ngControl.valid ? IgxComboState.VALID : IgxComboState.INVALID;
        }
        this.manageRequiredAsterisk();
    }

    protected manageRequiredAsterisk(): void {
        if (this.ngControl && this.ngControl.control.validator) {
            // Run the validation with empty object to check if required is enabled.
            const error = this.ngControl.control.validator({} as AbstractControl);
            this.inputGroup.isRequired = error && error.required;
        }
    }

    /**
     * @hidden @internal
     */
    public onBlur() {
        if (this.collapsed) {
            if (this.ngControl && !this.ngControl.valid) {
                this.valid = IgxComboState.INVALID;
            } else {
                this.valid = IgxComboState.INITIAL;
            }
        }
    }

    /**
     * @hidden @internal
     */
    public ngOnInit() {
        this.ngControl = this._injector.get<NgControl>(NgControl, null);
        this._overlaySettings.positionStrategy.settings.target = this.elementRef.nativeElement;
        this.selection.set(this.id, new Set());
    }

    /**
     * @hidden @internal
     */
    public ngAfterViewInit() {
        this.filteredData = [...this.data];

        if (this.ngControl) {
            this.ngControl.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(this.onStatusChanged);
            this.manageRequiredAsterisk();
            this.cdr.detectChanges();
        }
        this.virtDir.onChunkPreload.pipe(takeUntil(this.destroy$)).subscribe((e) => {
            this.onDataPreLoad.emit(e);
        });
    }

    /**
     * @hidden @internal
     */
    public ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.comboAPI.clear();
        this.selection.clear(this.id);
    }

    /**
     * @hidden @internal
     */
    public writeValue(value: any[]): void {
        this.selectItems(value, true);
        this.cdr.markForCheck();
    }

    /**
     * @hidden @internal
     */
    public registerOnChange(fn: any): void {
        this._onChangeCallback = fn;
    }

    /**
     * @hidden @internal
     */
    public registerOnTouched(fn: any): void { }

    /**
     * @hidden @internal
     */
    public setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    /**
     * @hidden
     */
    public getEditElement(): HTMLElement {
        return this.comboInput.nativeElement;
    }

    /**
     * @hidden @internal
     */
    public get template(): TemplateRef<any> {
        this._dataType = this.dataType;
        if (this.itemTemplate) {
            return this.itemTemplate;
        }
        if (this._dataType === DataTypes.COMPLEX) {
            return this.complexTemplate;
        }
        return this.primitiveTemplate;
    }

    /**
     * @hidden @internal
     */
    public get context(): any {
        return {
            $implicit: this
        };
    }

    /**
     * @hidden @internal
     */
    public handleClearItems(event: Event): void {
        this.deselectAllItems(true, event);
        event.stopPropagation();
    }

    /**
     * A method that opens/closes the combo.
     *
     *```html
     *<button (click)="combo.toggle()">Toggle Combo</button>
     *<igx-combo #combo></igx-combo>
     *```
     */
    public toggle(): void {
        const overlaySettings = Object.assign({}, this._overlaySettings, this.overlaySettings);
        this.dropdown.toggle(overlaySettings);
    }

    /**
     * A method that opens the combo.
     *
     *```html
     *<button (click)="combo.open()">Open Combo</button>
     *<igx-combo #combo></igx-combo>
     *```
     */
    public open(): void {
        const overlaySettings = Object.assign({}, this._overlaySettings, this.overlaySettings);
        this.dropdown.open(overlaySettings);
    }

    /**
     * A method that closes the combo.
     *
     *```html
     *<button (click)="combo.close()">Close Combo</button>
     *<igx-combo #combo></igx-combo>
     *```
     */
    public close(): void {
        this.dropdown.close();
    }

    /**
     * Gets drop down state.
     *
     * ```typescript
     * let state = this.combo.collapsed;
     * ```
    */
    public get collapsed(): boolean {
        return this.dropdown.collapsed;
    }

    /**
     * Get current selection state
     * @returns Array of selected items
     * ```typescript
     * let selectedItems = this.combo.selectedItems();
     * ```
     */
    public selectedItems() {
        const items = Array.from(this.selection.get(this.id));
        return items;
    }

    /**
     * Select defined items
     * @param newItems new items to be selected
     * @param clearCurrentSelection if true clear previous selected items
     * ```typescript
     * this.combo.selectItems(["New York", "New Jersey"]);
     * ```
     */
    public selectItems(newItems: Array<any>, clearCurrentSelection?: boolean, event?: Event) {
        if (newItems) {
            const newSelection = this.selection.add_items(this.id, newItems, clearCurrentSelection);
            this.setSelection(newSelection, event);
        }
    }

    /**
     * Deselect defined items
     * @param items items to deselected
     * ```typescript
     * this.combo.deselectItems(["New York", "New Jersey"]);
     * ```
     */
    public deselectItems(items: Array<any>, event?: Event) {
        if (items) {
            const newSelection = this.selection.delete_items(this.id, items);
            this.setSelection(newSelection, event);
        }
    }

    /**
     * Select all (filtered) items
     * @param ignoreFilter if set to true, selects all items, otherwise selects only the filtered ones.
     * ```typescript
     * this.combo.selectAllItems();
     * ```
     */
    public selectAllItems(ignoreFilter?: boolean, event?: Event) {
        const allVisible = this.selection.get_all_ids(ignoreFilter ? this.data : this.filteredData, this.valueKey);
        const newSelection = this.selection.add_items(this.id, allVisible);
        this.setSelection(newSelection, event);
    }

    /**
     * Deselect all (filtered) items
     * @param ignoreFilter if set to true, deselects all items, otherwise deselects only the filtered ones.
     * ```typescript
     * this.combo.deselectAllItems();
     * ```
     */
    public deselectAllItems(ignoreFilter?: boolean, event?: Event): void {
        let newSelection = this.selection.get_empty();
        if (this.filteredData.length !== this.data.length && !ignoreFilter) {
            newSelection = this.selection.delete_items(this.id, this.selection.get_all_ids(this.filteredData, this.valueKey));
        }
        this.setSelection(newSelection, event);
    }

    /**
     * Selects/Deselects a single item
     * @param itemID the itemID of the specific item
     * @param select If the item should be selected (true) or deselected (false)
     *
     * Without specified valueKey;
     * ```typescript
     * this.combo.valueKey = null;
     * const items: { field: string, region: string}[] = data;
     * this.combo.setSelectedItem(items[0], true);
     * ```
     * With specified valueKey;
     * ```typescript
     * this.combo.valueKey = 'field';
     * const items: { field: string, region: string}[] = data;
     * this.combo.setSelectedItem('Connecticut', true);
     * ```
     */
    public setSelectedItem(itemID: any, select = true, event?: Event): void {
        if (itemID === null || itemID === undefined) {
            return;
        }
        if (select) {
            this.selectItems([itemID], false, event);
        } else {
            this.deselectItems([itemID], event);
        }
    }

    protected setSelection(newSelection: Set<any>, event?: Event): void {
        const removed = diffInSets(this.selection.get(this.id), newSelection);
        const added = diffInSets(newSelection, this.selection.get(this.id));
        const newSelectionAsArray = Array.from(newSelection);
        const text = this.concatTextValue(newSelectionAsArray);
        const args: IComboSelectionChangeEventArgs = {
            newSelection: newSelectionAsArray,
            oldSelection: Array.from(this.selection.get(this.id) || []),
            added,
            removed,
            event,
            textValue: text,
            cancel: false
        };
        this.onSelectionChange.emit(args);
        if (!args.cancel) {
            this.selection.select_items(this.id, args.newSelection, true);
            let value = '';
            if (this.isRemote) {
                if (args.newSelection.length) {
                    const removedItems = args.oldSelection.filter(e => args.newSelection.indexOf(e) < 0);
                    const addedItems = args.newSelection.filter(e => args.oldSelection.indexOf(e) < 0);
                    this.registerRemoteEntries(addedItems);
                    this.registerRemoteEntries(removedItems, false);
                    value = Object.keys(this._remoteSelection).map(e => this._remoteSelection[e]).join(', ');
                } else {
                    // If new selection is empty, clear all items
                    this.registerRemoteEntries(args.oldSelection, false);
                }
            } else {
                value = this.displayKey !== null && this.displayKey !== undefined ?
                    this.convertKeysToItems(args.newSelection).map(entry => entry[this.displayKey]).join(', ') :
                    args.newSelection.join(', ');
            }
            this._value = value;
            this._onChangeCallback(args.newSelection);
        }
    }

    /** Returns a string that should be populated in the combo's text box
     * If the combo is remote, returns an empty string (as the items may not be loaded yet)
     */
    private concatTextValue(selection: any[]): string {
        if (this.isRemote) { return ''; }
        const value = this.displayKey !== null && this.displayKey !== undefined ?
        this.convertKeysToItems(selection).map(entry => entry[this.displayKey]).join(', ') :
        selection.join(', ');
        return value;
    }

    /** if there is a valueKey - map the keys to data items, else - just return the keys */
    private convertKeysToItems(keys: any[]) {
        if (this.comboAPI.valueKey === null) {
            return keys;
        }
        // map keys vs. filter data to retain the order of the selected items
        return keys.map(key => this.data.find(entry => entry[this.valueKey] === key)).filter(e => e !== undefined);
    }
    /**
     * Event handlers
     * @hidden
     * @internal
     */
    public handleOpening(event: CancelableEventArgs) {
        this.onOpening.emit(event);
        if (event.cancel) {
            return;
        }
    }

    /**
     * @hidden @internal
     */
    public handleOpened() {
        this.triggerCheck();
        this.focusSearchInput(true);
        this.onOpened.emit();
    }

    /**
     * @hidden @internal
     */
    public handleClosing(event) {
        this.onClosing.emit(event);
        if (event.cancel) {
            return;
        }
        this.searchValue = '';
        this.comboInput.nativeElement.focus();
    }

    /**
     * @hidden @internal
     */
    public handleClosed() {
        this.onClosed.emit();
    }
}

/**
 * @hidden
 */
@NgModule({
    declarations: [IgxComboComponent, IgxComboItemComponent, IgxComboGroupingPipe,
        IgxComboFilteringPipe, IgxComboDropDownComponent, IgxComboAddItemComponent,
        IgxComboItemDirective,
        IgxComboEmptyDirective,
        IgxComboHeaderItemDirective,
        IgxComboHeaderDirective,
        IgxComboFooterDirective,
        IgxComboAddItemDirective,
        IgxComboToggleIconDirective,
        IgxComboClearIconDirective],
    exports: [IgxComboComponent, IgxComboItemComponent, IgxComboDropDownComponent, IgxComboAddItemComponent,
        IgxComboItemDirective,
        IgxComboEmptyDirective,
        IgxComboHeaderItemDirective,
        IgxComboHeaderDirective,
        IgxComboFooterDirective,
        IgxComboAddItemDirective,
        IgxComboToggleIconDirective,
        IgxComboClearIconDirective],
    imports: [IgxRippleModule, CommonModule, IgxInputGroupModule, FormsModule, ReactiveFormsModule,
        IgxForOfModule, IgxToggleModule, IgxCheckboxModule, IgxDropDownModule, IgxButtonModule, IgxIconModule]
})
export class IgxComboModule { }
