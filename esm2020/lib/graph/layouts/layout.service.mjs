import { Injectable } from '@angular/core';
import { DagreLayout } from './dagre';
import { DagreClusterLayout } from './dagreCluster';
import { DagreNodesOnlyLayout } from './dagreNodesOnly';
import { D3ForceDirectedLayout } from './d3ForceDirected';
import { ColaForceDirectedLayout } from './colaForceDirected';
import * as i0 from "@angular/core";
const layouts = {
    dagre: DagreLayout,
    dagreCluster: DagreClusterLayout,
    dagreNodesOnly: DagreNodesOnlyLayout,
    d3ForceDirected: D3ForceDirectedLayout,
    colaForceDirected: ColaForceDirectedLayout
};
export class LayoutService {
    getLayout(name) {
        if (layouts[name]) {
            return new layouts[name]();
        }
        else {
            throw new Error(`Unknown layout type '${name}'`);
        }
    }
}
LayoutService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: LayoutService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
LayoutService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: LayoutService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: LayoutService, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0LnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zd2ltbGFuZS9uZ3gtZ3JhcGgvc3JjL2xpYi9ncmFwaC9sYXlvdXRzL2xheW91dC5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFM0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQzs7QUFFOUQsTUFBTSxPQUFPLEdBQUc7SUFDZCxLQUFLLEVBQUUsV0FBVztJQUNsQixZQUFZLEVBQUUsa0JBQWtCO0lBQ2hDLGNBQWMsRUFBRSxvQkFBb0I7SUFDcEMsZUFBZSxFQUFFLHFCQUFxQjtJQUN0QyxpQkFBaUIsRUFBRSx1QkFBdUI7Q0FDM0MsQ0FBQztBQUdGLE1BQU0sT0FBTyxhQUFhO0lBQ3hCLFNBQVMsQ0FBQyxJQUFZO1FBQ3BCLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pCLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztTQUM1QjthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxHQUFHLENBQUMsQ0FBQztTQUNsRDtJQUNILENBQUM7OzBHQVBVLGFBQWE7OEdBQWIsYUFBYTsyRkFBYixhQUFhO2tCQUR6QixVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTGF5b3V0IH0gZnJvbSAnLi4vLi4vbW9kZWxzL2xheW91dC5tb2RlbCc7XG5pbXBvcnQgeyBEYWdyZUxheW91dCB9IGZyb20gJy4vZGFncmUnO1xuaW1wb3J0IHsgRGFncmVDbHVzdGVyTGF5b3V0IH0gZnJvbSAnLi9kYWdyZUNsdXN0ZXInO1xuaW1wb3J0IHsgRGFncmVOb2Rlc09ubHlMYXlvdXQgfSBmcm9tICcuL2RhZ3JlTm9kZXNPbmx5JztcbmltcG9ydCB7IEQzRm9yY2VEaXJlY3RlZExheW91dCB9IGZyb20gJy4vZDNGb3JjZURpcmVjdGVkJztcbmltcG9ydCB7IENvbGFGb3JjZURpcmVjdGVkTGF5b3V0IH0gZnJvbSAnLi9jb2xhRm9yY2VEaXJlY3RlZCc7XG5cbmNvbnN0IGxheW91dHMgPSB7XG4gIGRhZ3JlOiBEYWdyZUxheW91dCxcbiAgZGFncmVDbHVzdGVyOiBEYWdyZUNsdXN0ZXJMYXlvdXQsXG4gIGRhZ3JlTm9kZXNPbmx5OiBEYWdyZU5vZGVzT25seUxheW91dCxcbiAgZDNGb3JjZURpcmVjdGVkOiBEM0ZvcmNlRGlyZWN0ZWRMYXlvdXQsXG4gIGNvbGFGb3JjZURpcmVjdGVkOiBDb2xhRm9yY2VEaXJlY3RlZExheW91dFxufTtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIExheW91dFNlcnZpY2Uge1xuICBnZXRMYXlvdXQobmFtZTogc3RyaW5nKTogTGF5b3V0IHtcbiAgICBpZiAobGF5b3V0c1tuYW1lXSkge1xuICAgICAgcmV0dXJuIG5ldyBsYXlvdXRzW25hbWVdKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBsYXlvdXQgdHlwZSAnJHtuYW1lfSdgKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==