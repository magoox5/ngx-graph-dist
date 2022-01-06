import { id } from '../../utils/id';
import { d3adaptor } from 'webcola';
import * as d3Dispatch from 'd3-dispatch';
import * as d3Force from 'd3-force';
import * as d3Timer from 'd3-timer';
import { Subject } from 'rxjs';
export function toNode(nodes, nodeRef) {
    if (typeof nodeRef === 'number') {
        return nodes[nodeRef];
    }
    return nodeRef;
}
export class ColaForceDirectedLayout {
    constructor() {
        this.defaultSettings = {
            force: d3adaptor(Object.assign(Object.assign(Object.assign({}, d3Dispatch), d3Force), d3Timer))
                .linkDistance(150)
                .avoidOverlaps(true),
            viewDimensions: {
                width: 600,
                height: 600
            }
        };
        this.settings = {};
        this.outputGraph$ = new Subject();
    }
    run(graph) {
        this.inputGraph = graph;
        if (!this.inputGraph.clusters) {
            this.inputGraph.clusters = [];
        }
        this.internalGraph = {
            nodes: [
                ...this.inputGraph.nodes.map(n => (Object.assign(Object.assign({}, n), { width: n.dimension ? n.dimension.width : 20, height: n.dimension ? n.dimension.height : 20 })))
            ],
            groups: [
                ...this.inputGraph.clusters.map((cluster) => ({
                    padding: 5,
                    groups: cluster.childNodeIds
                        .map(nodeId => this.inputGraph.clusters.findIndex(node => node.id === nodeId))
                        .filter(x => x >= 0),
                    leaves: cluster.childNodeIds
                        .map(nodeId => this.inputGraph.nodes.findIndex(node => node.id === nodeId))
                        .filter(x => x >= 0)
                }))
            ],
            links: [
                ...this.inputGraph.edges
                    .map(e => {
                    const sourceNodeIndex = this.inputGraph.nodes.findIndex(node => e.source === node.id);
                    const targetNodeIndex = this.inputGraph.nodes.findIndex(node => e.target === node.id);
                    if (sourceNodeIndex === -1 || targetNodeIndex === -1) {
                        return undefined;
                    }
                    return Object.assign(Object.assign({}, e), { source: sourceNodeIndex, target: targetNodeIndex });
                })
                    .filter(x => !!x)
            ],
            groupLinks: [
                ...this.inputGraph.edges
                    .map(e => {
                    const sourceNodeIndex = this.inputGraph.nodes.findIndex(node => e.source === node.id);
                    const targetNodeIndex = this.inputGraph.nodes.findIndex(node => e.target === node.id);
                    if (sourceNodeIndex >= 0 && targetNodeIndex >= 0) {
                        return undefined;
                    }
                    return e;
                })
                    .filter(x => !!x)
            ]
        };
        this.outputGraph = {
            nodes: [],
            clusters: [],
            edges: [],
            edgeLabels: []
        };
        this.outputGraph$.next(this.outputGraph);
        this.settings = Object.assign({}, this.defaultSettings, this.settings);
        if (this.settings.force) {
            this.settings.force = this.settings.force
                .nodes(this.internalGraph.nodes)
                .groups(this.internalGraph.groups)
                .links(this.internalGraph.links)
                .alpha(0.5)
                .on('tick', () => {
                if (this.settings.onTickListener) {
                    this.settings.onTickListener(this.internalGraph);
                }
                this.outputGraph$.next(this.internalGraphToOutputGraph(this.internalGraph));
            });
            if (this.settings.viewDimensions) {
                this.settings.force = this.settings.force.size([
                    this.settings.viewDimensions.width,
                    this.settings.viewDimensions.height
                ]);
            }
            if (this.settings.forceModifierFn) {
                this.settings.force = this.settings.forceModifierFn(this.settings.force);
            }
            this.settings.force.start();
        }
        return this.outputGraph$.asObservable();
    }
    updateEdge(graph, edge) {
        const settings = Object.assign({}, this.defaultSettings, this.settings);
        if (settings.force) {
            settings.force.start();
        }
        return this.outputGraph$.asObservable();
    }
    internalGraphToOutputGraph(internalGraph) {
        this.outputGraph.nodes = internalGraph.nodes.map(node => (Object.assign(Object.assign({}, node), { id: node.id || id(), position: {
                x: node.x,
                y: node.y
            }, dimension: {
                width: (node.dimension && node.dimension.width) || 20,
                height: (node.dimension && node.dimension.height) || 20
            }, transform: `translate(${node.x - ((node.dimension && node.dimension.width) || 20) / 2 || 0}, ${node.y - ((node.dimension && node.dimension.height) || 20) / 2 || 0})` })));
        this.outputGraph.edges = internalGraph.links
            .map(edge => {
            const source = toNode(internalGraph.nodes, edge.source);
            const target = toNode(internalGraph.nodes, edge.target);
            return Object.assign(Object.assign({}, edge), { source: source.id, target: target.id, points: [
                    source.bounds.rayIntersection(target.bounds.cx(), target.bounds.cy()),
                    target.bounds.rayIntersection(source.bounds.cx(), source.bounds.cy())
                ] });
        })
            .concat(internalGraph.groupLinks.map(groupLink => {
            const sourceNode = internalGraph.nodes.find(foundNode => foundNode.id === groupLink.source);
            const targetNode = internalGraph.nodes.find(foundNode => foundNode.id === groupLink.target);
            const source = sourceNode || internalGraph.groups.find(foundGroup => foundGroup.id === groupLink.source);
            const target = targetNode || internalGraph.groups.find(foundGroup => foundGroup.id === groupLink.target);
            return Object.assign(Object.assign({}, groupLink), { source: source.id, target: target.id, points: [
                    source.bounds.rayIntersection(target.bounds.cx(), target.bounds.cy()),
                    target.bounds.rayIntersection(source.bounds.cx(), source.bounds.cy())
                ] });
        }));
        this.outputGraph.clusters = internalGraph.groups.map((group, index) => {
            const inputGroup = this.inputGraph.clusters[index];
            return Object.assign(Object.assign({}, inputGroup), { dimension: {
                    width: group.bounds ? group.bounds.width() : 20,
                    height: group.bounds ? group.bounds.height() : 20
                }, position: {
                    x: group.bounds ? group.bounds.x + group.bounds.width() / 2 : 0,
                    y: group.bounds ? group.bounds.y + group.bounds.height() / 2 : 0
                } });
        });
        this.outputGraph.edgeLabels = this.outputGraph.edges;
        return this.outputGraph;
    }
    onDragStart(draggingNode, $event) {
        const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
        const node = this.internalGraph.nodes[nodeIndex];
        if (!node) {
            return;
        }
        this.draggingStart = { x: node.x - $event.x, y: node.y - $event.y };
        node.fixed = 1;
        this.settings.force.start();
    }
    onDrag(draggingNode, $event) {
        if (!draggingNode) {
            return;
        }
        const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
        const node = this.internalGraph.nodes[nodeIndex];
        if (!node) {
            return;
        }
        node.x = this.draggingStart.x + $event.x;
        node.y = this.draggingStart.y + $event.y;
    }
    onDragEnd(draggingNode, $event) {
        if (!draggingNode) {
            return;
        }
        const nodeIndex = this.outputGraph.nodes.findIndex(foundNode => foundNode.id === draggingNode.id);
        const node = this.internalGraph.nodes[nodeIndex];
        if (!node) {
            return;
        }
        node.fixed = 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sYUZvcmNlRGlyZWN0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zd2ltbGFuZS9uZ3gtZ3JhcGgvc3JjL2xpYi9ncmFwaC9sYXlvdXRzL2NvbGFGb3JjZURpcmVjdGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwQyxPQUFPLEVBQUUsU0FBUyxFQUFrRixNQUFNLFNBQVMsQ0FBQztBQUNwSCxPQUFPLEtBQUssVUFBVSxNQUFNLGFBQWEsQ0FBQztBQUMxQyxPQUFPLEtBQUssT0FBTyxNQUFNLFVBQVUsQ0FBQztBQUNwQyxPQUFPLEtBQUssT0FBTyxNQUFNLFVBQVUsQ0FBQztBQUVwQyxPQUFPLEVBQWMsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBYzNDLE1BQU0sVUFBVSxNQUFNLENBQUMsS0FBa0IsRUFBRSxPQUEyQjtJQUNwRSxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtRQUMvQixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN2QjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBQ0Usb0JBQWUsR0FBOEI7WUFDM0MsS0FBSyxFQUFFLFNBQVMsK0NBQ1gsVUFBVSxHQUNWLE9BQU8sR0FDUCxPQUFPLEVBQ1Y7aUJBQ0MsWUFBWSxDQUFDLEdBQUcsQ0FBQztpQkFDakIsYUFBYSxDQUFDLElBQUksQ0FBQztZQUN0QixjQUFjLEVBQUU7Z0JBQ2QsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsTUFBTSxFQUFFLEdBQUc7YUFDWjtTQUNGLENBQUM7UUFDRixhQUFRLEdBQThCLEVBQUUsQ0FBQztRQUt6QyxpQkFBWSxHQUFtQixJQUFJLE9BQU8sRUFBRSxDQUFDO0lBa04vQyxDQUFDO0lBOU1DLEdBQUcsQ0FBQyxLQUFZO1FBQ2QsSUFBSSxDQUFD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QUFZLEVBQUU7WUFDakIsT0FBTztTQUNSO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEcsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE9BQU87U0FDUjtRQUNELElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsQ0FBQyxZQUFrQixFQUFFLE1BQWtCO1FBQzlDLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDakIsT0FBTztTQUNSO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEcsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE9BQU87U0FDUjtRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExheW91dCB9IGZyb20gJy4uLy4uL21vZGVscy9sYXlvdXQubW9kZWwnO1xuaW1wb3J0IHsgR3JhcGggfSBmcm9tICcuLi8uLi9tb2RlbHMvZ3JhcGgubW9kZWwnO1xuaW1wb3J0IHsgTm9kZSwgQ2x1c3Rlck5vZGUgfSBmcm9tICcuLi8uLi9tb2RlbHMvbm9kZS5tb2RlbCc7XG5pbXBvcnQgeyBpZCB9IGZyb20gJy4uLy4uL3V0aWxzL2lkJztcbmltcG9ydCB7IGQzYWRhcHRvciwgSUQzU3R5bGVMYXlvdXRBZGFwdG9yLCBMYXlvdXQgYXMgQ29sYUxheW91dCwgR3JvdXAsIElucHV0Tm9kZSwgTGluaywgUmVjdGFuZ2xlIH0gZnJvbSAnd2ViY29sYSc7XG5pbXBvcnQgKiBhcyBkM0Rpc3BhdGNoIGZyb20gJ2QzLWRpc3BhdGNoJztcbmltcG9ydCAqIGFzIGQzRm9yY2UgZnJvbSAnZDMtZm9yY2UnO1xuaW1wb3J0ICogYXMgZDNUaW1lciBmcm9tICdkMy10aW1lcic7XG5pbXBvcnQgeyBFZGdlIH0gZnJvbSAnLi4vLi4vbW9kZWxzL2VkZ2UubW9kZWwnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgVmlld0RpbWVuc2lvbnMgfSBmcm9tICcuLi8uLi91dGlscy92aWV3LWRpbWVuc2lvbnMuaGVscGVyJztcblxuZXhwb3J0IGludGVyZmFjZSBDb2xhRm9yY2VEaXJlY3RlZFNldHRpbmdzIHtcbiAgZm9yY2U/OiBDb2xhTGF5b3V0ICYgSUQzU3R5bGVMYXlvdXRBZGFwdG9yO1xuICBmb3JjZU1vZGlmaWVyRm4/OiAoZm9yY2U6IENvbGFMYXlvdXQgJiBJRDNTdHlsZUxheW91dEFkYXB0b3IpID0+IENvbGFMYXlvdXQgJiBJRDNTdHlsZUxheW91dEFkYXB0b3I7XG4gIG9uVGlja0xpc3RlbmVyPzogKGludGVybmFsR3JhcGg6IENvbGFHcmFwaCkgPT4gdm9pZDtcbiAgdmlld0RpbWVuc2lvbnM/OiBWaWV3RGltZW5zaW9ucztcbn1cbmV4cG9ydCBpbnRlcmZhY2UgQ29sYUdyYXBoIHtcbiAgZ3JvdXBzOiBHcm91cFtdO1xuICBub2RlczogSW5wdXROb2RlW107XG4gIGxpbmtzOiBBcnJheTxMaW5rPG51bWJlcj4+O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRvTm9kZShub2RlczogSW5wdXROb2RlW10sIG5vZGVSZWY6IElucHV0Tm9kZSB8IG51bWJlcik6IElucHV0Tm9kZSB7XG4gIGlmICh0eXBlb2Ygbm9kZVJlZiA9PT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gbm9kZXNbbm9kZVJlZl07XG4gIH1cbiAgcmV0dXJuIG5vZGVSZWY7XG59XG5cbmV4cG9ydCBjbGFzcyBDb2xhRm9yY2VEaXJlY3RlZExheW91dCBpbXBsZW1lbnRzIExheW91dCB7XG4gIGRlZmF1bHRTZXR0aW5nczogQ29sYUZvcmNlRGlyZWN0ZWRTZXR0aW5ncyA9IHtcbiAgICBmb3JjZTogZDNhZGFwdG9yKHtcbiAgICAgIC4uLmQzRGlzcGF0Y2gsXG4gICAgICAuLi5kM0ZvcmNlLFxuICAgICAgLi4uZDNUaW1lclxuICAgIH0pXG4gICAgICAubGlua0Rpc3RhbmNlKDE1MClcbiAgICAgIC5hdm9pZE92ZXJsYXBzKHRydWUpLFxuICAgIHZpZXdEaW1lbnNpb25zOiB7XG4gICAgICB3aWR0aDogNjAwLFxuICAgICAgaGVpZ2h0OiA2MDBcbiAgICB9XG4gIH07XG4gIHNldHRpbmdzOiBDb2xhRm9yY2VEaXJlY3RlZFNldHRpbmdzID0ge307XG5cbiAgaW5wdXRHcmFwaDogR3JhcGg7XG4gIG91dHB1dEdyYXBoOiBHcmFwaDtcbiAgaW50ZXJuYWxHcmFwaDogQ29sYUdyYXBoICYgeyBncm91cExpbmtzPzogRWRnZVtdIH07XG4gIG91dHB1dEdyYXBoJDogU3ViamVjdDxHcmFwaD4gPSBuZXcgU3ViamVjdCgpO1xuXG4gIGRyYWdnaW5nU3RhcnQ6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfTtcblxuICBydW4oZ3JhcGg6IEdyYXBoKTogT2JzZXJ2YWJsZTxHcmFwaD4ge1xuICAgIHRoaXMuaW5wdXRHcmFwaCA9IGdyYXBoO1xuICAgIGlmICghdGhpcy5pbnB1dEdyYXBoLmNsdXN0ZXJzKSB7XG4gICAgICB0aGlzLmlucHV0R3JhcGguY2x1c3RlcnMgPSBbXTtcbiAgICB9XG4gICAgdGhpcy5pbnRlcm5hbEdyYXBoID0ge1xuICAgICAgbm9kZXM6IFtcbiAgICAgICAgLi4udGhpcy5pbnB1dEdyYXBoLm5vZGVzLm1hcChuID0+ICh7XG4gICAgICAgICAgLi4ubixcbiAgICAgICAgICB3aWR0aDogbi5kaW1lbnNpb24gPyBuLmRpbWVuc2lvbi53aWR0aCA6IDIwLFxuICAgICAgICAgIGhlaWdodDogbi5kaW1lbnNpb24gPyBuLmRpbWVuc2lvbi5oZWlnaHQgOiAyMFxuICAgICAgICB9KSlcbiAgICAgIF0gYXMgYW55LFxuICAgICAgZ3JvdXBzOiBbXG4gICAgICAgIC4uLnRoaXMuaW5wdXRHcmFwaC5jbHVzdGVycy5tYXAoXG4gICAgICAgICAgKGNsdXN0ZXIpOiBHcm91cCA9PiAoe1xuICAgICAgICAgICAgcGFkZGluZzogNSxcbiAgICAgICAgICAgIGdyb3VwczogY2x1c3Rlci5jaGlsZE5vZGVJZHNcbiAgICAgICAgICAgICAgLm1hcChub2RlSWQgPT4gPGFueT50aGlzLmlucHV0R3JhcGguY2x1c3RlcnMuZmluZEluZGV4KG5vZGUgPT4gbm9kZS5pZCA9PT0gbm9kZUlkKSlcbiAgICAgICAgICAgICAgLmZpbHRlcih4ID0+IHggPj0gMCksXG4gICAgICAgICAgICBsZWF2ZXM6IGNsdXN0ZXIuY2hpbGROb2RlSWRzXG4gICAgICAgICAgICAgIC5tYXAobm9kZUlkID0+IDxhbnk+dGhpcy5pbnB1dEdyYXBoLm5vZGVzLmZpbmRJbmRleChub2RlID0+IG5vZGUuaWQgPT09IG5vZGVJZCkpXG4gICAgICAgICAgICAgIC5maWx0ZXIoeCA9PiB4ID49IDApXG4gICAgICAgICAgfSlcbiAgICAgICAgKVxuICAgICAgXSxcbiAgICAgIGxpbmtzOiBbXG4gICAgICAgIC4uLnRoaXMuaW5wdXRHcmFwaC5lZGdlc1xuICAgICAgICAgIC5tYXAoZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzb3VyY2VOb2RlSW5kZXggPSB0aGlzLmlucHV0R3JhcGgubm9kZXMuZmluZEluZGV4KG5vZGUgPT4gZS5zb3VyY2UgPT09IG5vZGUuaWQpO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Tm9kZUluZGV4ID0gdGhpcy5pbnB1dEdyYXBoLm5vZGVzLmZpbmRJbmRleChub2RlID0+IGUudGFyZ2V0ID09PSBub2RlLmlkKTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VOb2RlSW5kZXggPT09IC0xIHx8IHRhcmdldE5vZGVJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIC4uLmUsXG4gICAgICAgICAgICAgIHNvdXJjZTogc291cmNlTm9kZUluZGV4LFxuICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldE5vZGVJbmRleFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIoeCA9PiAhIXgpXG4gICAgICBdIGFzIGFueSxcbiAgICAgIGdyb3VwTGlua3M6IFtcbiAgICAgICAgLi4udGhpcy5pbnB1dEdyYXBoLmVkZ2VzXG4gICAgICAgICAgLm1hcChlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZU5vZGVJbmRleCA9IHRoaXMuaW5wdXRHcmFwaC5ub2Rlcy5maW5kSW5kZXgobm9kZSA9PiBlLnNvdXJjZSA9PT0gbm9kZS5pZCk7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXROb2RlSW5kZXggPSB0aGlzLmlucHV0R3JhcGgubm9kZXMuZmluZEluZGV4KG5vZGUgPT4gZS50YXJnZXQgPT09IG5vZGUuaWQpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZU5vZGVJbmRleCA+PSAwICYmIHRhcmdldE5vZGVJbmRleCA+PSAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIoeCA9PiAhIXgpXG4gICAgICBdXG4gICAgfTtcbiAgICB0aGlzLm91dHB1dEdyYXBoID0ge1xuICAgICAgbm9kZXM6IFtdLFxuICAgICAgY2x1c3RlcnM6IFtdLFxuICAgICAgZWRnZXM6IFtdLFxuICAgICAgZWRnZUxhYmVsczogW11cbiAgICB9O1xuICAgIHRoaXMub3V0cHV0R3JhcGgkLm5leHQodGhpcy5vdXRwdXRHcmFwaCk7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGVmYXVsdFNldHRpbmdzLCB0aGlzLnNldHRpbmdzKTtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5mb3JjZSkge1xuICAgICAgdGhpcy5zZXR0aW5ncy5mb3JjZSA9IHRoaXMuc2V0dGluZ3MuZm9yY2VcbiAgICAgICAgLm5vZGVzKHRoaXMuaW50ZXJuYWxHcmFwaC5ub2RlcylcbiAgICAgICAgLmdyb3Vwcyh0aGlzLmludGVybmFsR3JhcGguZ3JvdXBzKVxuICAgICAgICAubGlua3ModGhpcy5pbnRlcm5hbEdyYXBoLmxpbmtzKVxuICAgICAgICAuYWxwaGEoMC41KVxuICAgICAgICAub24oJ3RpY2snLCAoKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mub25UaWNrTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Mub25UaWNrTGlzdGVuZXIodGhpcy5pbnRlcm5hbEdyYXBoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5vdXRwdXRHcmFwaCQubmV4dCh0aGlzLmludGVybmFsR3JhcGhUb091dHB1dEdyYXBoKHRoaXMuaW50ZXJuYWxHcmFwaCkpO1xuICAgICAgICB9KTtcbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLnZpZXdEaW1lbnNpb25zKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZm9yY2UgPSB0aGlzLnNldHRpbmdzLmZvcmNlLnNpemUoW1xuICAgICAgICAgIHRoaXMuc2V0dGluZ3Mudmlld0RpbWVuc2lvbnMud2lkdGgsXG4gICAgICAgICAgdGhpcy5zZXR0aW5ncy52aWV3RGltZW5zaW9ucy5oZWlnaHRcbiAgICAgICAgXSk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5mb3JjZU1vZGlmaWVyRm4pIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5mb3JjZSA9IHRoaXMuc2V0dGluZ3MuZm9yY2VNb2RpZmllckZuKHRoaXMuc2V0dGluZ3MuZm9yY2UpO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXR0aW5ncy5mb3JjZS5zdGFydCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm91dHB1dEdyYXBoJC5hc09ic2VydmFibGUoKTtcbiAgfVxuXG4gIHVwZGF0ZUVkZ2UoZ3JhcGg6IEdyYXBoLCBlZGdlOiBFZGdlKTogT2JzZXJ2YWJsZTxHcmFwaD4ge1xuICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5kZWZhdWx0U2V0dGluZ3MsIHRoaXMuc2V0dGluZ3MpO1xuICAgIGlmIChzZXR0aW5ncy5mb3JjZSkge1xuICAgICAgc2V0dGluZ3MuZm9yY2Uuc3RhcnQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vdXRwdXRHcmFwaCQuYXNPYnNlcnZhYmxlKCk7XG4gIH1cblxuICBpbnRlcm5hbEdyYXBoVG9PdXRwdXRHcmFwaChpbnRlcm5hbEdyYXBoOiBhbnkpOiBHcmFwaCB7XG4gICAgdGhpcy5vdXRwdXRHcmFwaC5ub2RlcyA9IGludGVybmFsR3JhcGgubm9kZXMubWFwKG5vZGUgPT4gKHtcbiAgICAgIC4uLm5vZGUsXG4gICAgICBpZDogbm9kZS5pZCB8fCBpZCgpLFxuICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgeDogbm9kZS54LFxuICAgICAgICB5OiBub2RlLnlcbiAgICAgIH0sXG4gICAgICBkaW1lbnNpb246IHtcbiAgICAgICAgd2lkdGg6IChub2RlLmRpbWVuc2lvbiAmJiBub2RlLmRpbWVuc2lvbi53aWR0aCkgfHwgMjAsXG4gICAgICAgIGhlaWdodDogKG5vZGUuZGltZW5zaW9uICYmIG5vZGUuZGltZW5zaW9uLmhlaWdodCkgfHwgMjBcbiAgICAgIH0sXG4gICAgICB0cmFuc2Zvcm06IGB0cmFuc2xhdGUoJHtub2RlLnggLSAoKG5vZGUuZGltZW5zaW9uICYmIG5vZGUuZGltZW5zaW9uLndpZHRoKSB8fCAyMCkgLyAyIHx8IDB9LCAke1xuICAgICAgICBub2RlLnkgLSAoKG5vZGUuZGltZW5zaW9uICYmIG5vZGUuZGltZW5zaW9uLmhlaWdodCkgfHwgMjApIC8gMiB8fCAwXG4gICAgICB9KWBcbiAgICB9KSk7XG5cbiAgICB0aGlzLm91dHB1dEdyYXBoLmVkZ2VzID0gaW50ZXJuYWxHcmFwaC5saW5rc1xuICAgICAgLm1hcChlZGdlID0+IHtcbiAgICAgICAgY29uc3Qgc291cmNlOiBhbnkgPSB0b05vZGUoaW50ZXJuYWxHcmFwaC5ub2RlcywgZWRnZS5zb3VyY2UpO1xuICAgICAgICBjb25zdCB0YXJnZXQ6IGFueSA9IHRvTm9kZShpbnRlcm5hbEdyYXBoLm5vZGVzLCBlZGdlLnRhcmdldCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4uZWRnZSxcbiAgICAgICAgICBzb3VyY2U6IHNvdXJjZS5pZCxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldC5pZCxcbiAgICAgICAgICBwb2ludHM6IFtcbiAgICAgICAgICAgIChzb3VyY2UuYm91bmRzIGFzIFJlY3RhbmdsZSkucmF5SW50ZXJzZWN0aW9uKHRhcmdldC5ib3VuZHMuY3goKSwgdGFyZ2V0LmJvdW5kcy5jeSgpKSxcbiAgICAgICAgICAgICh0YXJnZXQuYm91bmRzIGFzIFJlY3RhbmdsZSkucmF5SW50ZXJzZWN0aW9uKHNvdXJjZS5ib3VuZHMuY3goKSwgc291cmNlLmJvdW5kcy5jeSgpKVxuICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAuY29uY2F0KFxuICAgICAgICBpbnRlcm5hbEdyYXBoLmdyb3VwTGlua3MubWFwKGdyb3VwTGluayA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlTm9kZSA9IGludGVybmFsR3JhcGgubm9kZXMuZmluZChmb3VuZE5vZGUgPT4gKGZvdW5kTm9kZSBhcyBhbnkpLmlkID09PSBncm91cExpbmsuc291cmNlKTtcbiAgICAgICAgICBjb25zdCB0YXJnZXROb2RlID0gaW50ZXJuYWxHcmFwaC5ub2Rlcy5maW5kKGZvdW5kTm9kZSA9PiAoZm91bmROb2RlIGFzIGFueSkuaWQgPT09IGdyb3VwTGluay50YXJnZXQpO1xuICAgICAgICAgIGNvbnN0IHNvdXJjZSA9XG4gICAgICAgICAgICBzb3VyY2VOb2RlIHx8IGludGVybmFsR3JhcGguZ3JvdXBzLmZpbmQoZm91bmRHcm91cCA9PiAoZm91bmRHcm91cCBhcyBhbnkpLmlkID09PSBncm91cExpbmsuc291cmNlKTtcbiAgICAgICAgICBjb25zdCB0YXJnZXQgPVxuICAgICAgICAgICAgdGFyZ2V0Tm9kZSB8fCBpbnRlcm5hbEdyYXBoLmdyb3Vwcy5maW5kKGZvdW5kR3JvdXAgPT4gKGZvdW5kR3JvdXAgYXMgYW55KS5pZCA9PT0gZ3JvdXBMaW5rLnRhcmdldCk7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmdyb3VwTGluayxcbiAgICAgICAgICAgIHNvdXJjZTogc291cmNlLmlkLFxuICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQuaWQsXG4gICAgICAgICAgICBwb2ludHM6IFtcbiAgICAgICAgICAgICAgKHNvdXJjZS5ib3VuZHMgYXMgUmVjdGFuZ2xlKS5yYXlJbnRlcnNlY3Rpb24odGFyZ2V0LmJvdW5kcy5jeCgpLCB0YXJnZXQuYm91bmRzLmN5KCkpLFxuICAgICAgICAgICAgICAodGFyZ2V0LmJvdW5kcyBhcyBSZWN0YW5nbGUpLnJheUludGVyc2VjdGlvbihzb3VyY2UuYm91bmRzLmN4KCksIHNvdXJjZS5ib3VuZHMuY3koKSlcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9O1xuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIHRoaXMub3V0cHV0R3JhcGguY2x1c3RlcnMgPSBpbnRlcm5hbEdyYXBoLmdyb3Vwcy5tYXAoXG4gICAgICAoZ3JvdXAsIGluZGV4KTogQ2x1c3Rlck5vZGUgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dEdyb3VwID0gdGhpcy5pbnB1dEdyYXBoLmNsdXN0ZXJzW2luZGV4XTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5pbnB1dEdyb3VwLFxuICAgICAgICAgIGRpbWVuc2lvbjoge1xuICAgICAgICAgICAgd2lkdGg6IGdyb3VwLmJvdW5kcyA/IGdyb3VwLmJvdW5kcy53aWR0aCgpIDogMjAsXG4gICAgICAgICAgICBoZWlnaHQ6IGdyb3VwLmJvdW5kcyA/IGdyb3VwLmJvdW5kcy5oZWlnaHQoKSA6IDIwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgeDogZ3JvdXAuYm91bmRzID8gZ3JvdXAuYm91bmRzLnggKyBncm91cC5ib3VuZHMud2lkdGgoKSAvIDIgOiAwLFxuICAgICAgICAgICAgeTogZ3JvdXAuYm91bmRzID8gZ3JvdXAuYm91bmRzLnkgKyBncm91cC5ib3VuZHMuaGVpZ2h0KCkgLyAyIDogMFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMub3V0cHV0R3JhcGguZWRnZUxhYmVscyA9IHRoaXMub3V0cHV0R3JhcGguZWRnZXM7XG4gICAgcmV0dXJuIHRoaXMub3V0cHV0R3JhcGg7XG4gIH1cblxuICBvbkRyYWdTdGFydChkcmFnZ2luZ05vZGU6IE5vZGUsICRldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGNvbnN0IG5vZGVJbmRleCA9IHRoaXMub3V0cHV0R3JhcGgubm9kZXMuZmluZEluZGV4KGZvdW5kTm9kZSA9PiBmb3VuZE5vZGUuaWQgPT09IGRyYWdnaW5nTm9kZS5pZCk7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuaW50ZXJuYWxHcmFwaC5ub2Rlc1tub2RlSW5kZXhdO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRyYWdnaW5nU3RhcnQgPSB7IHg6IG5vZGUueCAtICRldmVudC54LCB5OiBub2RlLnkgLSAkZXZlbnQueSB9O1xuICAgIG5vZGUuZml4ZWQgPSAxO1xuICAgIHRoaXMuc2V0dGluZ3MuZm9yY2Uuc3RhcnQoKTtcbiAgfVxuXG4gIG9uRHJhZyhkcmFnZ2luZ05vZGU6IE5vZGUsICRldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGlmICghZHJhZ2dpbmdOb2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5vZGVJbmRleCA9IHRoaXMub3V0cHV0R3JhcGgubm9kZXMuZmluZEluZGV4KGZvdW5kTm9kZSA9PiBmb3VuZE5vZGUuaWQgPT09IGRyYWdnaW5nTm9kZS5pZCk7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuaW50ZXJuYWxHcmFwaC5ub2Rlc1tub2RlSW5kZXhdO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBub2RlLnggPSB0aGlzLmRyYWdnaW5nU3RhcnQueCArICRldmVudC54O1xuICAgIG5vZGUueSA9IHRoaXMuZHJhZ2dpbmdTdGFydC55ICsgJGV2ZW50Lnk7XG4gIH1cblxuICBvbkRyYWdFbmQoZHJhZ2dpbmdOb2RlOiBOb2RlLCAkZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIWRyYWdnaW5nTm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBub2RlSW5kZXggPSB0aGlzLm91dHB1dEdyYXBoLm5vZGVzLmZpbmRJbmRleChmb3VuZE5vZGUgPT4gZm91bmROb2RlLmlkID09PSBkcmFnZ2luZ05vZGUuaWQpO1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLmludGVybmFsR3JhcGgubm9kZXNbbm9kZUluZGV4XTtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBub2RlLmZpeGVkID0gMDtcbiAgfVxufVxuIl19