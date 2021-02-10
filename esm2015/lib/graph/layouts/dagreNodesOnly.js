import { id } from '../../utils/id';
import * as dagre from 'dagre';
import { Orientation } from './dagre';
const DEFAULT_EDGE_NAME = '\x00';
const GRAPH_NODE = '\x00';
const EDGE_KEY_DELIM = '\x01';
export class DagreNodesOnlyLayout {
    constructor() {
        this.defaultSettings = {
            orientation: Orientation.LEFT_TO_RIGHT,
            marginX: 20,
            marginY: 20,
            edgePadding: 100,
            rankPadding: 100,
            nodePadding: 50,
            curveDistance: 20,
            multigraph: true,
            compound: true
        };
        this.settings = {};
    }
    run(graph) {
        this.createDagreGraph(graph);
        dagre.layout(this.dagreGraph);
        graph.edgeLabels = this.dagreGraph._edgeLabels;
        for (const dagreNodeId in this.dagreGraph._nodes) {
            const dagreNode = this.dagreGraph._nodes[dagreNodeId];
            const node = graph.nodes.find(n => n.id === dagreNode.id);
            node.position = {
                x: dagreNode.x,
                y: dagreNode.y
            };
            node.dimension = {
                width: dagreNode.width,
                height: dagreNode.height
            };
        }
        for (const edge of graph.edges) {
            this.updateEdge(graph, edge);
        }
        return graph;
    }
    updateEdge(graph, edge) {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        const targetNode = graph.nodes.find(n => n.id === edge.target);
        const rankAxis = this.settings.orientation === 'BT' || this.settings.orientation === 'TB' ? 'y' : 'x';
        const orderAxis = rankAxis === 'y' ? 'x' : 'y';
        const rankDimension = rankAxis === 'y' ? 'height' : 'width';
        // determine new arrow position
        const dir = sourceNode.position[rankAxis] <= targetNode.position[rankAxis] ? -1 : 1;
        const startingPoint = {
            [orderAxis]: sourceNode.position[orderAxis],
            [rankAxis]: sourceNode.position[rankAxis] - dir * (sourceNode.dimension[rankDimension] / 2)
        };
        const endingPoint = {
            [orderAxis]: targetNode.position[orderAxis],
            [rankAxis]: targetNode.position[rankAxis] + dir * (targetNode.dimension[rankDimension] / 2)
        };
        const curveDistance = this.settings.curveDistance || this.defaultSettings.curveDistance;
        // generate new points
        edge.points = [
            startingPoint,
            {
                [orderAxis]: startingPoint[orderAxis],
                [rankAxis]: startingPoint[rankAxis] - dir * curveDistance
            },
            {
                [orderAxis]: endingPoint[orderAxis],
                [rankAxis]: endingPoint[rankAxis] + dir * curveDistance
            },
            endingPoint
        ];
        const edgeLabelId = `${edge.source}${EDGE_KEY_DELIM}${edge.target}${EDGE_KEY_DELIM}${DEFAULT_EDGE_NAME}`;
        const matchingEdgeLabel = graph.edgeLabels[edgeLabelId];
        if (matchingEdgeLabel) {
            matchingEdgeLabel.points = edge.points;
        }
        return graph;
    }
    createDagreGraph(graph) {
        const settings = Object.assign({}, this.defaultSettings, this.settings);
        this.dagreGraph = new dagre.graphlib.Graph({ compound: settings.compound, multigraph: settings.multigraph });
        this.dagreGraph.setGraph({
            rankdir: settings.orientation,
            marginx: settings.marginX,
            marginy: settings.marginY,
            edgesep: settings.edgePadding,
            ranksep: settings.rankPadding,
            nodesep: settings.nodePadding,
            align: settings.align,
            acyclicer: settings.acyclicer,
            ranker: settings.ranker,
            multigraph: settings.multigraph,
            compound: settings.compound
        });
        // Default to assigning a new object as a label for each new edge.
        this.dagreGraph.setDefaultEdgeLabel(() => {
            return {
            /* empty */
            };
        });
        this.dagreNodes = graph.nodes.map(n => {
            const node = Object.assign({}, n);
            node.width = n.dimension.width;
            node.height = n.dimension.height;
            node.x = n.position.x;
            node.y = n.position.y;
            return node;
        });
        this.dagreEdges = graph.edges.map(l => {
            const newLink = Object.assign({}, l);
            if (!newLink.id) {
                newLink.id = id();
            }
            return newLink;
        });
        for (const node of this.dagreNodes) {
            if (!node.width) {
                node.width = 20;
            }
            if (!node.height) {
                node.height = 30;
            }
            // update dagre
            this.dagreGraph.setNode(node.id, node);
        }
        // update dagre
        for (const edge of this.dagreEdges) {
            if (settings.multigraph) {
                this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.id);
            }
            else {
                this.dagreGraph.setEdge(edge.source, edge.target);
            }
        }
        return this.dagreGraph;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGFncmVOb2Rlc09ubHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zd2ltbGFuZS9uZ3gtZ3JhcGgvc3JjL2xpYi9ncmFwaC9sYXlvdXRzL2RhZ3JlTm9kZXNPbmx5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUUvQixPQUFPLEVBQWlCLFdBQVcsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQU1yRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQztBQUNqQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUM7QUFDMUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDO0FBRTlCLE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFDRSxvQkFBZSxHQUEyQjtZQUN4QyxXQUFXLEVBQUUsV0FBVyxDQUFDLGFBQWE7WUFDdEMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLEVBQUUsRUFBRTtZQUNYLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLFdBQVcsRUFBRSxFQUFFO1lBQ2YsYUFBYSxFQUFFLEVBQUU7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsUUFBUSxFQUFFLElBQUk7U0FDZixDQUFDO1FBQ0YsYUFBUSxHQUEyQixFQUFFLENBQUM7SUFzSXhDLENBQUM7SUFoSUMsR0FBRyxDQUFDLEtBQVk7UUFDZCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFOUIsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztRQUUvQyxLQUFLLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFF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QyxDQUFDO1lBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7YUFDbkI7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztRQUVILEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDZixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzthQUNqQjtZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQzthQUNsQjtZQUVELGVBQWU7WUFDZixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3hDO1FBRUQsZUFBZTtRQUNmLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNsQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUU7Z0JBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2xFO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ25EO1NBQ0Y7UUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDekIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGF5b3V0IH0gZnJvbSAnLi4vLi4vbW9kZWxzL2xheW91dC5tb2RlbCc7XG5pbXBvcnQgeyBHcmFwaCB9IGZyb20gJy4uLy4uL21vZGVscy9ncmFwaC5tb2RlbCc7XG5pbXBvcnQgeyBpZCB9IGZyb20gJy4uLy4uL3V0aWxzL2lkJztcbmltcG9ydCAqIGFzIGRhZ3JlIGZyb20gJ2RhZ3JlJztcbmltcG9ydCB7IEVkZ2UgfSBmcm9tICcuLi8uLi9tb2RlbHMvZWRnZS5tb2RlbCc7XG5pbXBvcnQgeyBEYWdyZVNldHRpbmdzLCBPcmllbnRhdGlvbiB9IGZyb20gJy4vZGFncmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERhZ3JlTm9kZXNPbmx5U2V0dGluZ3MgZXh0ZW5kcyBEYWdyZVNldHRpbmdzIHtcbiAgY3VydmVEaXN0YW5jZT86IG51bWJlcjtcbn1cblxuY29uc3QgREVGQVVMVF9FREdFX05BTUUgPSAnXFx4MDAnO1xuY29uc3QgR1JBUEhfTk9ERSA9ICdcXHgwMCc7XG5jb25zdCBFREdFX0tFWV9ERUxJTSA9ICdcXHgwMSc7XG5cbmV4cG9ydCBjbGFzcyBEYWdyZU5vZGVzT25seUxheW91dCBpbXBsZW1lbnRzIExheW91dCB7XG4gIGRlZmF1bHRTZXR0aW5nczogRGFncmVOb2Rlc09ubHlTZXR0aW5ncyA9IHtcbiAgICBvcmllbnRhdGlvbjogT3JpZW50YXRpb24uTEVGVF9UT19SSUdIVCxcbiAgICBtYXJnaW5YOiAyMCxcbiAgICBtYXJnaW5ZOiAyMCxcbiAgICBlZGdlUGFkZGluZzogMTAwLFxuICAgIHJhbmtQYWRkaW5nOiAxMDAsXG4gICAgbm9kZVBhZGRpbmc6IDUwLFxuICAgIGN1cnZlRGlzdGFuY2U6IDIwLFxuICAgIG11bHRpZ3JhcGg6IHRydWUsXG4gICAgY29tcG91bmQ6IHRydWVcbiAgfTtcbiAgc2V0dGluZ3M6IERhZ3JlTm9kZXNPbmx5U2V0dGluZ3MgPSB7fTtcblxuICBkYWdyZUdyYXBoOiBhbnk7XG4gIGRhZ3JlTm9kZXM6IGFueTtcbiAgZGFncmVFZGdlczogYW55O1xuXG4gIHJ1bihncmFwaDogR3JhcGgpOiBHcmFwaCB7XG4gICAgdGhpcy5jcmVhdGVEYWdyZUdyYXBoKGdyYXBoKTtcbiAgICBkYWdyZS5sYXlvdXQodGhpcy5kYWdyZUdyYXBoKTtcblxuICAgIGdyYXBoLmVkZ2VMYWJlbHMgPSB0aGlzLmRhZ3JlR3JhcGguX2VkZ2VMYWJlbHM7XG5cbiAgICBmb3IgKGNvbnN0IGRhZ3JlTm9kZUlkIGluIHRoaXMuZGFncmVHcmFwaC5fbm9kZXMpIHtcbiAgICAgIGNvbnN0IGRhZ3JlTm9kZSA9IHRoaXMuZGFncmVHcmFwaC5fbm9kZXNbZGFncmVOb2RlSWRdO1xuICAgICAgY29uc3Qgbm9kZSA9IGdyYXBoLm5vZGVzLmZpbmQobiA9PiBuLmlkID09PSBkYWdyZU5vZGUuaWQpO1xuICAgICAgbm9kZS5wb3NpdGlvbiA9IHtcbiAgICAgICAgeDogZGFncmVOb2RlLngsXG4gICAgICAgIHk6IGRhZ3JlTm9kZS55XG4gICAgICB9O1xuICAgICAgbm9kZS5kaW1lbnNpb24gPSB7XG4gICAgICAgIHdpZHRoOiBkYWdyZU5vZGUud2lkdGgsXG4gICAgICAgIGhlaWdodDogZGFncmVOb2RlLmhlaWdodFxuICAgICAgfTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBlZGdlIG9mIGdyYXBoLmVkZ2VzKSB7XG4gICAgICB0aGlzLnVwZGF0ZUVkZ2UoZ3JhcGgsIGVkZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiBncmFwaDtcbiAgfVxuXG4gIHVwZGF0ZUVkZ2UoZ3JhcGg6IEdyYXBoLCBlZGdlOiBFZGdlKTogR3JhcGgge1xuICAgIGNvbnN0IHNvdXJjZU5vZGUgPSBncmFwaC5ub2Rlcy5maW5kKG4gPT4gbi5pZCA9PT0gZWRnZS5zb3VyY2UpO1xuICAgIGNvbnN0IHRhcmdldE5vZGUgPSBncmFwaC5ub2Rlcy5maW5kKG4gPT4gbi5pZCA9PT0gZWRnZS50YXJnZXQpO1xuICAgIGNvbnN0IHJhbmtBeGlzOiAneCcgfCAneScgPSB0aGlzLnNldHRpbmdzLm9yaWVudGF0aW9uID09PSAnQlQnIHx8IHRoaXMuc2V0dGluZ3Mub3JpZW50YXRpb24gPT09ICdUQicgPyAneScgOiAneCc7XG4gICAgY29uc3Qgb3JkZXJBeGlzOiAneCcgfCAneScgPSByYW5rQXhpcyA9PT0gJ3knID8gJ3gnIDogJ3knO1xuICAgIGNvbnN0IHJhbmtEaW1lbnNpb24gPSByYW5rQXhpcyA9PT0gJ3knID8gJ2hlaWdodCcgOiAnd2lkdGgnO1xuICAgIC8vIGRldGVybWluZSBuZXcgYXJyb3cgcG9zaXRpb25cbiAgICBjb25zdCBkaXIgPSBzb3VyY2VOb2RlLnBvc2l0aW9uW3JhbmtBeGlzXSA8PSB0YXJnZXROb2RlLnBvc2l0aW9uW3JhbmtBeGlzXSA/IC0xIDogMTtcbiAgICBjb25zdCBzdGFydGluZ1BvaW50ID0ge1xuICAgICAgW29yZGVyQXhpc106IHNvdXJjZU5vZGUucG9zaXRpb25bb3JkZXJBeGlzXSxcbiAgICAgIFtyYW5rQXhpc106IHNvdXJjZU5vZGUucG9zaXRpb25bcmFua0F4aXNdIC0gZGlyICogKHNvdXJjZU5vZGUuZGltZW5zaW9uW3JhbmtEaW1lbnNpb25dIC8gMilcbiAgICB9O1xuICAgIGNvbnN0IGVuZGluZ1BvaW50ID0ge1xuICAgICAgW29yZGVyQXhpc106IHRhcmdldE5vZGUucG9zaXRpb25bb3JkZXJBeGlzXSxcbiAgICAgIFtyYW5rQXhpc106IHRhcmdldE5vZGUucG9zaXRpb25bcmFua0F4aXNdICsgZGlyICogKHRhcmdldE5vZGUuZGltZW5zaW9uW3JhbmtEaW1lbnNpb25dIC8gMilcbiAgICB9O1xuXG4gICAgY29uc3QgY3VydmVEaXN0YW5jZSA9IHRoaXMuc2V0dGluZ3MuY3VydmVEaXN0YW5jZSB8fCB0aGlzLmRlZmF1bHRTZXR0aW5ncy5jdXJ2ZURpc3RhbmNlO1xuICAgIC8vIGdlbmVyYXRlIG5ldyBwb2ludHNcbiAgICBlZGdlLnBvaW50cyA9IFtcbiAgICAgIHN0YXJ0aW5nUG9pbnQsXG4gICAgICB7XG4gICAgICAgIFtvcmRlckF4aXNdOiBzdGFydGluZ1BvaW50W29yZGVyQXhpc10sXG4gICAgICAgIFtyYW5rQXhpc106IHN0YXJ0aW5nUG9pbnRbcmFua0F4aXNdIC0gZGlyICogY3VydmVEaXN0YW5jZVxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgW29yZGVyQXhpc106IGVuZGluZ1BvaW50W29yZGVyQXhpc10sXG4gICAgICAgIFtyYW5rQXhpc106IGVuZGluZ1BvaW50W3JhbmtBeGlzXSArIGRpciAqIGN1cnZlRGlzdGFuY2VcbiAgICAgIH0sXG4gICAgICBlbmRpbmdQb2ludFxuICAgIF07XG4gICAgY29uc3QgZWRnZUxhYmVsSWQgPSBgJHtlZGdlLnNvdXJjZX0ke0VER0VfS0VZX0RFTElNfSR7ZWRnZS50YXJnZXR9JHtFREdFX0tFWV9ERUxJTX0ke0RFRkFVTFRfRURHRV9OQU1FfWA7XG4gICAgY29uc3QgbWF0Y2hpbmdFZGdlTGFiZWwgPSBncmFwaC5lZGdlTGFiZWxzW2VkZ2VMYWJlbElkXTtcbiAgICBpZiAobWF0Y2hpbmdFZGdlTGFiZWwpIHtcbiAgICAgIG1hdGNoaW5nRWRnZUxhYmVsLnBvaW50cyA9IGVkZ2UucG9pbnRzO1xuICAgIH1cbiAgICByZXR1cm4gZ3JhcGg7XG4gIH1cblxuICBjcmVhdGVEYWdyZUdyYXBoKGdyYXBoOiBHcmFwaCk6IGFueSB7XG4gICAgY29uc3Qgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRlZmF1bHRTZXR0aW5ncywgdGhpcy5zZXR0aW5ncyk7XG4gICAgdGhpcy5kYWdyZUdyYXBoID0gbmV3IGRhZ3JlLmdyYXBobGliLkdyYXBoKHsgY29tcG91bmQ6IHNldHRpbmdzLmNvbXBvdW5kLCBtdWx0aWdyYXBoOiBzZXR0aW5ncy5tdWx0aWdyYXBoIH0pO1xuICAgIHRoaXMuZGFncmVHcmFwaC5zZXRHcmFwaCh7XG4gICAgICByYW5rZGlyOiBzZXR0aW5ncy5vcmllbnRhdGlvbixcbiAgICAgIG1hcmdpbng6IHNldHRpbmdzLm1hcmdpblgsXG4gICAgICBtYXJnaW55OiBzZXR0aW5ncy5tYXJnaW5ZLFxuICAgICAgZWRnZXNlcDogc2V0dGluZ3MuZWRnZVBhZGRpbmcsXG4gICAgICByYW5rc2VwOiBzZXR0aW5ncy5yYW5rUGFkZGluZyxcbiAgICAgIG5vZGVzZXA6IHNldHRpbmdzLm5vZGVQYWRkaW5nLFxuICAgICAgYWxpZ246IHNldHRpbmdzLmFsaWduLFxuICAgICAgYWN5Y2xpY2VyOiBzZXR0aW5ncy5hY3ljbGljZXIsXG4gICAgICByYW5rZXI6IHNldHRpbmdzLnJhbmtlcixcbiAgICAgIG11bHRpZ3JhcGg6IHNldHRpbmdzLm11bHRpZ3JhcGgsXG4gICAgICBjb21wb3VuZDogc2V0dGluZ3MuY29tcG91bmRcbiAgICB9KTtcblxuICAgIC8vIERlZmF1bHQgdG8gYXNzaWduaW5nIGEgbmV3IG9iamVjdCBhcyBhIGxhYmVsIGZvciBlYWNoIG5ldyBlZGdlLlxuICAgIHRoaXMuZGFncmVHcmFwaC5zZXREZWZhdWx0RWRnZUxhYmVsKCgpID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC8qIGVtcHR5ICovXG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgdGhpcy5kYWdyZU5vZGVzID0gZ3JhcGgubm9kZXMubWFwKG4gPT4ge1xuICAgICAgY29uc3Qgbm9kZTogYW55ID0gT2JqZWN0LmFzc2lnbih7fSwgbik7XG4gICAgICBub2RlLndpZHRoID0gbi5kaW1lbnNpb24ud2lkdGg7XG4gICAgICBub2RlLmhlaWdodCA9IG4uZGltZW5zaW9uLmhlaWdodDtcbiAgICAgIG5vZGUueCA9IG4ucG9zaXRpb24ueDtcbiAgICAgIG5vZGUueSA9IG4ucG9zaXRpb24ueTtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kYWdyZUVkZ2VzID0gZ3JhcGguZWRnZXMubWFwKGwgPT4ge1xuICAgICAgY29uc3QgbmV3TGluazogYW55ID0gT2JqZWN0LmFzc2lnbih7fSwgbCk7XG4gICAgICBpZiAoIW5ld0xpbmsuaWQpIHtcbiAgICAgICAgbmV3TGluay5pZCA9IGlkKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3TGluaztcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0aGlzLmRhZ3JlTm9kZXMpIHtcbiAgICAgIGlmICghbm9kZS53aWR0aCkge1xuICAgICAgICBub2RlLndpZHRoID0gMjA7XG4gICAgICB9XG4gICAgICBpZiAoIW5vZGUuaGVpZ2h0KSB7XG4gICAgICAgIG5vZGUuaGVpZ2h0ID0gMzA7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBkYWdyZVxuICAgICAgdGhpcy5kYWdyZUdyYXBoLnNldE5vZGUobm9kZS5pZCwgbm9kZSk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIGRhZ3JlXG4gICAgZm9yIChjb25zdCBlZGdlIG9mIHRoaXMuZGFncmVFZGdlcykge1xuICAgICAgaWYgKHNldHRpbmdzLm11bHRpZ3JhcGgpIHtcbiAgICAgICAgdGhpcy5kYWdyZUdyYXBoLnNldEVkZ2UoZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0LCBlZGdlLCBlZGdlLmlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGFncmVHcmFwaC5zZXRFZGdlKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGFncmVHcmFwaDtcbiAgfVxufVxuIl19