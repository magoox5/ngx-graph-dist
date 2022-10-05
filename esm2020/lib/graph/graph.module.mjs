import { NgModule } from '@angular/core';
import { GraphComponent } from './graph.component';
import { MouseWheelDirective } from './mouse-wheel.directive';
import { LayoutService } from './layouts/layout.service';
import { CommonModule } from '@angular/common';
import { VisibilityObserver } from '../utils/visibility-observer';
import * as i0 from "@angular/core";
export { GraphComponent };
export class GraphModule {
}
GraphModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: GraphModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
GraphModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.2.5", ngImport: i0, type: GraphModule, declarations: [GraphComponent, MouseWheelDirective, VisibilityObserver], imports: [CommonModule], exports: [GraphComponent, MouseWheelDirective] });
GraphModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: GraphModule, providers: [LayoutService], imports: [CommonModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: GraphModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule],
                    declarations: [GraphComponent, MouseWheelDirective, VisibilityObserver],
                    exports: [GraphComponent, MouseWheelDirective],
                    providers: [LayoutService]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGgubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3dpbWxhbmUvbmd4LWdyYXBoL3NyYy9saWIvZ3JhcGgvZ3JhcGgubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7O0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsQ0FBQztBQVExQixNQUFNLE9BQU8sV0FBVzs7d0dBQVgsV0FBVzt5R0FBWCxXQUFXLGlCQUpQLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsYUFENUQsWUFBWSxhQUVaLGNBQWMsRUFBRSxtQkFBbUI7eUdBR2xDLFdBQVcsYUFGWCxDQUFDLGFBQWEsQ0FBQyxZQUhoQixZQUFZOzJGQUtYLFdBQVc7a0JBTnZCLFFBQVE7bUJBQUM7b0JBQ1IsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO29CQUN2QixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUM7b0JBQ3ZFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQztvQkFDOUMsU0FBUyxFQUFFLENBQUMsYUFBYSxDQUFDO2lCQUMzQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBHcmFwaENvbXBvbmVudCB9IGZyb20gJy4vZ3JhcGguY29tcG9uZW50JztcbmltcG9ydCB7IE1vdXNlV2hlZWxEaXJlY3RpdmUgfSBmcm9tICcuL21vdXNlLXdoZWVsLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBMYXlvdXRTZXJ2aWNlIH0gZnJvbSAnLi9sYXlvdXRzL2xheW91dC5zZXJ2aWNlJztcbmltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBWaXNpYmlsaXR5T2JzZXJ2ZXIgfSBmcm9tICcuLi91dGlscy92aXNpYmlsaXR5LW9ic2VydmVyJztcbmV4cG9ydCB7IEdyYXBoQ29tcG9uZW50IH07XG5cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFtDb21tb25Nb2R1bGVdLFxuICBkZWNsYXJhdGlvbnM6IFtHcmFwaENvbXBvbmVudCwgTW91c2VXaGVlbERpcmVjdGl2ZSwgVmlzaWJpbGl0eU9ic2VydmVyXSxcbiAgZXhwb3J0czogW0dyYXBoQ29tcG9uZW50LCBNb3VzZVdoZWVsRGlyZWN0aXZlXSxcbiAgcHJvdmlkZXJzOiBbTGF5b3V0U2VydmljZV1cbn0pXG5leHBvcnQgY2xhc3MgR3JhcGhNb2R1bGUge31cbiJdfQ==