import { IgxComboItemComponent } from './combo-item.component';
import { Component } from '@angular/core';

/**
 * @hidden
 */
@Component({
    selector: 'igx-combo-add-item',
    template: '<ng-content></ng-content>',
    providers: [{ provide: IgxComboItemComponent, useExisting: IgxComboAddItemComponent}]
})
export class IgxComboAddItemComponent extends IgxComboItemComponent {
    get selected(): boolean {
        return false;
    }
    set selected(value: boolean) {
    }

    /**
     * @inheritdoc
     */
    clicked(event?) {
        this.comboAPI.disableTransitions = false;
        this.comboAPI.add_custom_item();
    }
}
