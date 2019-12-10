import { IDropDownBase, IGX_DROPDOWN_BASE } from './drop-down.common';
import { Directive, Input, HostBinding, HostListener, ElementRef, Optional, Inject, DoCheck, Output, EventEmitter } from '@angular/core';
import { IgxSelectionAPIService } from '../core/selection';
import { DeprecateProperty, showMessage } from '../core/deprecateDecorators';
import { IgxDropDownGroupComponent } from './drop-down-group.component';

let NEXT_ID = 0;
let warningShown = false;

/**
 * An abstract class defining a drop-down item:
 * With properties / styles for selection, highlight, height
 * Bindable property for passing data (`value: any`)
 * Parent component (has to be used under a parent with type `IDropDownBase`)
 * Method for handling click on Host()
 */
@Directive({
    selector: '[igxDropDownItemBase]'
})
export class IgxDropDownItemBaseDirective implements DoCheck {
    /**
     * @hidden
     */
    protected _focused = false;
    protected _selected = false;
    protected _index = null;
    protected _disabled = false;
    protected get hasIndex(): boolean {
        return this._index !== null && this._index !== undefined;
    }

    /**
     * Sets/gets the `id` of the item.
     * ```html
     * <igx-drop-down-item [id] = 'igx-drop-down-item-0'></igx-drop-down-item>
     * ```
     * ```typescript
     * let itemId =  this.item.id;
     * ```
     * @memberof IgxSelectItemComponent
     */
    @HostBinding('attr.id')
    @Input()
    public id = `igx-drop-down-item-${NEXT_ID++}`;

    /**
     * @hidden @internal
     */
    public get itemID() {
        return this;
    }

    /**
     * The data index of the dropdown item.
     *
     * ```typescript
     * // get the data index of the selected dropdown item
     * let selectedItemIndex = this.dropdown.selectedItem.index
     * ```
     */
    @Input()
    public get index(): number {
        if (this._index === null) {
            warningShown = showMessage(
                'IgxDropDownItemBaseDirective: Automatic index is deprecated.' +
                'Bind in the template instead using `<igx-drop-down-item [index]="i"` instead.`',
                warningShown);
            return this.itemIndex;
        }
        return this._index;
    }

    public set index(value) {
        this._index = value;
    }

    /**
     * Gets/sets the value of the item if the item is databound
     *
     * ```typescript
     * // usage in IgxDropDownItemComponent
     * // get
     * let mySelectedItemValue = this.dropdown.selectedItem.value;
     *
     * // set
     * let mySelectedItem = this.dropdown.selectedItem;
     * mySelectedItem.value = { id: 123, name: 'Example Name' }
     *
     * // usage in IgxComboItemComponent
     * // get
     * let myComboItemValue = this.combo.items[0].value;
     * ```
     */
    @Input()
    public value: any;

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-drop-down__item')
    get itemStyle(): boolean {
        return !this.isHeader;
    }

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-drop-down__item--cosy')
    public get itemStyleCosy() {
        return this.dropDown.displayDensity === 'cosy' && !this.isHeader;
    }

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-drop-down__item--compact')
    public get itemStyleCompact() {
        return this.dropDown.displayDensity === 'compact' && !this.isHeader;
    }

    /**
     * Sets/Gets if the item is the currently selected one in the dropdown
     *
     * ```typescript
     *  let mySelectedItem = this.dropdown.selectedItem;
     *  let isMyItemSelected = mySelectedItem.selected; // true
     * ```
     *
     * Two-way data binding
     * ```html
     * <igx-drop-down-item [(selected)]='model.isSelected'></igx-drop-down-item>
     * ```
     */
    @Input()
    @HostBinding('attr.aria-selected')
    @HostBinding('class.igx-drop-down__item--selected')
    get selected(): boolean {
        return this._selected;
    }

    set selected(value: boolean) {
        if (this.isHeader) {
            return;
        }
        this._selected = value;
        this.selectedChange.emit(this._selected);
    }

    /**
     *@hidden
     */
    @Output()
    public selectedChange = new EventEmitter<boolean>();

    /**
     * @hidden @internal
     */
    @Input()
    @DeprecateProperty(`IgxDropDownItemBaseDirective \`isSelected\` property is deprecated.\n` +
        `Use \`selected\` instead.`)
    get isSelected(): boolean {
        return this.selected;
    }

    /**
     * @hidden @internal
     */
    set isSelected(value: boolean) {
        this.selected = value;
    }

    /**
     * Sets/gets if the given item is focused
     * ```typescript
     *  let mySelectedItem = this.dropdown.selectedItem;
     *  let isMyItemFocused = mySelectedItem.focused;
     * ```
     */
    @HostBinding('class.igx-drop-down__item--focused')
    get focused(): boolean {
        return (!this.isHeader && !this.disabled) && this._focused;
    }

    /**
     * ```html
     *  <igx-drop-down-item *ngFor="let item of items" focused={{!item.focused}}>
     *      <div>
     *          {{item.field}}
     *      </div>
     *  </igx-drop-down-item>
     * ```
     */
    set focused(value: boolean) {
        this._focused = value;
    }

    /**
     * @hidden @internal
     */
    @DeprecateProperty(`IgxDropDownItemBaseDirective \`isFocused\` property is depracated.\n` +
        `Use \`focused\` instead.`)
    get isFocused(): boolean {
        return this.focused;
    }
    /**
     * @hidden @internal
     */
    set isFocused(value: boolean) {
        this.focused = value;
    }

    /**
     * Sets/gets if the given item is header
     * ```typescript
     *  // get
     *  let mySelectedItem = this.dropdown.selectedItem;
     *  let isMyItemHeader = mySelectedItem.isHeader;
     * ```
     *
     * ```html
     *  <!--set-->
     *  <igx-dropdown-item *ngFor="let item of items">
     *      <div *ngIf="items.indexOf(item) === 5; then item.isHeader = true">
     *          {{item.field}}
*           </div>
     *  </igx-drop-down-item>
     * ```
     */
    @Input()
    @HostBinding('class.igx-drop-down__header')
    public isHeader: boolean;

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-drop-down__header--cosy')
    public get headerClassCosy() {
        return this.isHeader && this.dropDown.displayDensity === 'cosy';
    }

    /**
     * @hidden @internal
     */
    @HostBinding('class.igx-drop-down__header--compact')
    public get headerClassCompact() {
        return this.isHeader && this.dropDown.displayDensity === 'compact';
    }

    /**
     * Sets/gets if the given item is disabled
     *
     * ```typescript
     *  // get
     *  let mySelectedItem = this.dropdown.selectedItem;
     *  let myItemIsDisabled = mySelectedItem.disabled;
     * ```
     *
     * ```html
     *  <igx-drop-down-item *ngFor="let item of items" disabled={{!item.disabled}}>
     *      <div>
     *          {{item.field}}
     *      </div>
     *  </igx-drop-down-item>
     * ```
     * **NOTE:** Drop-down items inside of a disabled `IgxDropDownGroup` will always count as disabled
     */
    @Input()
    @HostBinding('attr.aria-disabled')
    @HostBinding('class.igx-drop-down__item--disabled')
    public get disabled(): boolean {
        return this.group ? this.group.disabled || this._disabled : this._disabled;
    }

    public set disabled(value: boolean) {
        this._disabled = value;
    }

    /**
     * Gets/sets the `role` attribute of the item. Default is 'option'.
     *
     * ```html
     *  <igx-drop-down-item [role]="customRole"></igx-drop-down-item>
     * ```
     */
    @Input()
    @HostBinding('attr.role')
    public role = 'option';

    /**
     * Gets item index
     * @hidden @internal
     */
    public get itemIndex(): number {
        return this.dropDown.items.indexOf(this);
    }

    /**
     * Gets item element height
     * @hidden @internal
     */
    public get elementHeight(): number {
        return this.elementRef.nativeElement.clientHeight;
    }

    /**
     * Get item html element
     * @hidden @internal
     */
    public get element(): ElementRef {
        return this.elementRef;
    }

    constructor(
        @Inject(IGX_DROPDOWN_BASE) protected dropDown: IDropDownBase,
        protected elementRef: ElementRef,
        @Optional() protected group: IgxDropDownGroupComponent,
        @Optional() @Inject(IgxSelectionAPIService) protected selection?: IgxSelectionAPIService
    ) { }

    ngDoCheck(): void {
        if (this._selected) {
            const dropDownSelectedItem = this.dropDown.selectedItem;
            if (!dropDownSelectedItem) {
                this.dropDown.selectItem(this);
            } else if (this.hasIndex
                ? this._index !== dropDownSelectedItem.index || this.value !== dropDownSelectedItem.value :
                this !== dropDownSelectedItem) {
                this.dropDown.selectItem(this);
            }
        }
    }

    /**
     * If the clicked item is a header or is disabled,
     * should not attempt to select it.
     * If `allowItemsFocus` is true, should move the focus to the actual item.
     */
    protected shouldSelect() {
        if (this.disabled || this.isHeader) {
            const focusedItem = this.dropDown.items.find((item) => item.focused);
            if (this.dropDown.allowItemsFocus && focusedItem) {
                focusedItem.element.nativeElement.focus({ preventScroll: true });
            }
            return false;
        } else {
            return true;
        }
    }

    /**
     * @hidden
     * @internal
     */
    @HostListener('click', ['$event'])
    clicked(event) {
    }
}
