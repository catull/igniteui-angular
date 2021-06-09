import { useAnimation } from '@angular/animations';
import { Component, ViewChild } from '@angular/core';
import { waitForAsync, TestBed, fakeAsync, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { slideInLeft, slideOutRight } from '../animations/slide';
import { IgxExpansionPanelModule } from '../expansion-panel/expansion-panel.module';
import { configureTestSuite } from '../test-utils/configure-suite';
import { IgxAccordionComponent } from './accordion.component';
import { IgxAccordionModule } from './accordion.module';

const ACCORDION_CLASS = 'igx-accordion__root';
const PANEL_TAG = 'IGX-EXPANSION-PANEL';
const CSS_CLASS_EXPANSION_PANEL = 'igx-expansion-panel';
const ACCORDION_TAG = 'IGX-ACCORDION';

describe('Rendering Tests', () => {
    configureTestSuite();
    let fix: ComponentFixture<IgxAccordionSampleTestComponent>;
    let accordion: IgxAccordionComponent;
    beforeAll(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    IgxAccordionSampleTestComponent,],
                imports: [
                    NoopAnimationsModule,
                    IgxAccordionModule,
                    IgxExpansionPanelModule
                ]
            }).compileComponents();
        })
    );
    beforeEach(() => {
        fix = TestBed.createComponent<IgxAccordionSampleTestComponent>(IgxAccordionSampleTestComponent);
        fix.detectChanges();
        accordion = fix.componentInstance.accordion;
    });

    describe('General', () => {
        it('Should render accordion with expansion panels', () => {
            const accordionElement: HTMLElement = fix.debugElement.queryAll(By.css(`.${ACCORDION_CLASS}`))[0].nativeElement;
            const childPanels = accordionElement.children;
            expect(childPanels.length).toBe(3);
            for (let i = 0; i < childPanels.length; i++) {
                expect(childPanels.item(i).tagName === PANEL_TAG).toBeTruthy();
            }
        });

        it('Should calculate accordion`s panels correctly', () => {
            expect(accordion.panels.length).toEqual(3);
        });

        it('Should allow overriding animationSettings that are used for expansion panels toggle', () => {
            const animationSettingsCustom = {
                closeAnimation: useAnimation(slideOutRight, { params: { duration: '100ms', toPosition: 'translateX(25px)' } }),
                openAnimation: useAnimation(slideInLeft, { params: { duration: '500ms', fromPosition: 'translateX(-15px)' } })
            };

            const animationSettingsCustomPanel = {
                closeAnimation: useAnimation(slideOutRight, { params: { duration: '200ms', toPosition: 'translateX(25px)' } }),
                openAnimation: useAnimation(slideInLeft, { params: { duration: '500ms', fromPosition: 'translateX(-15px)' } })
            };

            accordion.panels[0].animationSettings = animationSettingsCustomPanel;
            fix.detectChanges();

            accordion.animationSettings = animationSettingsCustom;
            fix.detectChanges();

            for (let i = 0; i < 3; i++) {
                expect(accordion.panels[i].animationSettings.closeAnimation.options.params.duration).toEqual('100ms');
            }
        });

        it('Should be able to render nested accordions', () => {
            const panelBody = accordion.panels[0].body?.element.nativeElement;
            expect(panelBody.children[0].tagName === ACCORDION_TAG).toBeTruthy();
        });

        it('Should be able to expand only one panel when expansionMode is set to `single` and expandAll/collapseAll should not update the current expansion state ', () => {
            spyOn(accordion.panelExpanded, 'emit').and.callThrough();
            spyOn(accordion.panelCollapsed, 'emit').and.callThrough();
            accordion.expansionMode = IgxExpansionType.Single;
            fix.detectChanges();

            accordion.expandAll();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(0);
            expect(accordion.panelExpanded.emit).toHaveBeenCalledTimes(0);

            accordion.panels[0].expand();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(1);
            expect(accordion.panels[0].collapsed).toBeFalse();
            expect(accordion.panels[1].collapsed).toBeTrue();

            accordion.collapseAll();
            fix.detectChanges();

            expect(accordion.panelCollapsed.emit).toHaveBeenCalledTimes(0);

            accordion.panels[1].expand();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(1);
            expect(accordion.panels[0].collapsed).toBeTrue();
            expect(accordion.panels[1].collapsed).toBeFalse();

        });

        it('Should be able to expand only one panel when expansionMode is set to `multiple`', () => {
            accordion.expansionMode = IgxExpansionType.Multiple;
            fix.detectChanges();

            accordion.panels[0].expand();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(1);
            expect(accordion.panels[0].collapsed).toBeFalse();
            expect(accordion.panels[1].collapsed).toBeTrue();

            accordion.panels[1].expand();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(2);
            expect(accordion.panels[0].collapsed).toBeFalse();
            expect(accordion.panels[1].collapsed).toBeFalse();
        });

        it('Should update the current expansion state when expandAll/collapseAll is invoked and expansionMode is set to `multiple`', () => {
            spyOn(accordion.panelExpanded, 'emit').and.callThrough();
            spyOn(accordion.panelCollapsed, 'emit').and.callThrough();
            accordion.expansionMode = IgxExpansionType.Multiple;
            fix.detectChanges();

            accordion.expandAll();
            fix.detectChanges();

            expect(accordion.panels.map(panel => panel.collapsed).length).toEqual(0);
            expect(accordion.panelExpanded.emit).toHaveBeenCalledTimes(3);

            accordion.collapseAll();
            fix.detectChanges();

            expect(accordion.panels.map(panel => !panel.collapsed).length).toEqual(0);
            expect(accordion.panelCollapsed.emit).toHaveBeenCalledTimes(3);
        });

        it('Should emit ing and ed events when expand panel state is toggled', () => {
            spyOn(accordion.panelExpanded, 'emit').and.callThrough();
            spyOn(accordion.panelExpanding, 'emit').and.callThrough();
            spyOn(accordion.panelCollapsed, 'emit').and.callThrough();
            spyOn(accordion.panelCollapsing, 'emit').and.callThrough();

            spyOn(accordion.panels[0].contentCollapsing, 'emit').and.callThrough();
            spyOn(accordion.panels[0].contentCollapsed, 'emit').and.callThrough();
            spyOn(accordion.panels[0].contentExpanding, 'emit').and.callThrough();
            spyOn(accordion.panels[0].contentExpanded, 'emit').and.callThrough();

            accordion.expansionMode = IgxExpansionType.Multiple;
            fix.detectChanges();

            accordion.panels[0].expand();
            fix.detectChanges();

            let argsEd, argsIng;
            const subsExpanded = accordion.panels[0].contentExpanded.subscribe(evt => {
                argsEd = evt;
            });

            const subsExpanding = accordion.panels[0].contentExpanding.subscribe(evt => {
                argsIng = evt;
            });

            expect(accordion.panelExpanding.emit).toHaveBeenCalledTimes(1);
            expect(accordion.panelExpanding.emit).toHaveBeenCalledWith(argsIng);
            expect(accordion.panelExpanded.emit).toHaveBeenCalledTimes(1);
            expect(accordion.panelExpanded.emit).toHaveBeenCalledWith(argsEd);

            subsExpanded.unsubscribe();
            subsExpanding.unsubscribe();

            accordion.panels[0].collapse();
            fix.detectChanges();

            const subsCollapsed = accordion.panels[0].contentCollapsed.subscribe(evt => {
                argsEd = evt;
            });

            const subsCollapsing = accordion.panels[0].contentCollapsing.subscribe(evt => {
                argsIng = evt;
            });

            expect(accordion.panelCollapsing.emit).toHaveBeenCalledTimes(1);
            expect(accordion.panelCollapsing.emit).toHaveBeenCalledWith(argsIng);
            expect(accordion.panelCollapsed.emit).toHaveBeenCalledTimes(1);
            expect(accordion.panelCollapsed.emit).toHaveBeenCalledWith(argsEd);

            subsCollapsed.unsubscribe();
            subsCollapsing.unsubscribe();
        });
    });
});

@Component({
    template: `
<igx-accordion>
    <igx-expansion-panel id="html5" [collapsed]="true">
        <igx-expansion-panel-header [disabled]="false">
            <igx-expansion-panel-title>HTML5</igx-expansion-panel-title>
        </igx-expansion-panel-header>
        <igx-expansion-panel-body>
            <igx-accordion>
                <igx-expansion-panel>
                    <igx-expansion-panel-header [disabled]="false">
                        <igx-expansion-panel-title>First</igx-expansion-panel-title>
                    </igx-expansion-panel-header>
                    <igx-expansion-panel-body>
                        <div>
                            Content1
                        </div>
                    </igx-expansion-panel-body>
                </igx-expansion-panel>
                <igx-expansion-panel>
                    <igx-expansion-panel-header [disabled]="false">
                        <igx-expansion-panel-title>Second</igx-expansion-panel-title>
                    </igx-expansion-panel-header>
                    <igx-expansion-panel-body>
                        <div>
                            Content2
                        </div>
                    </igx-expansion-panel-body>
                </igx-expansion-panel>
            </igx-accordion>
        </igx-expansion-panel-body>
    </igx-expansion-panel>
    <igx-expansion-panel id="css" [collapsed]="true">
        <igx-expansion-panel-header [disabled]="false">
            <igx-expansion-panel-title>CSS3</igx-expansion-panel-title>
        </igx-expansion-panel-header>
        <igx-expansion-panel-body>
            <div>
                Cascading Style Sheets (CSS) is a style sheet language used for
                describing the presentation of a document written in a markup language
                like HTML
            </div>
        </igx-expansion-panel-body>
    </igx-expansion-panel>
    <igx-expansion-panel id="scss" [collapsed]="false">
        <igx-expansion-panel-header [disabled]="false">
            <igx-expansion-panel-title>SASS/SCSS</igx-expansion-panel-title>
        </igx-expansion-panel-header>
        <igx-expansion-panel-body>
            <div>
                Sass is a preprocessor scripting language that is interpreted or
                compiled into Cascading Style Sheets (CSS).
            </div>
        </igx-expansion-panel-body>
    </igx-expansion-panel>
    <div *ngIf="divChild"></div>
</igx-accordion>

`
})
export class IgxAccordionSampleTestComponent {
    @ViewChild(IgxAccordionComponent) public accordion: IgxAccordionComponent;
    public divChild = true;
}
