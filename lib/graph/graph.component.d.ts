import { AfterViewInit, ElementRef, EventEmitter, OnDestroy, OnInit, QueryList, TemplateRef, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import 'd3-transition';
import { Observable, Subscription } from 'rxjs';
import { Layout } from '../models/layout.model';
import { LayoutService } from './layouts/layout.service';
import { Edge } from '../models/edge.model';
import { Node, ClusterNode } from '../models/node.model';
import { Graph } from '../models/graph.model';
import { PanningAxis } from '../enums/panning.enum';
import { MiniMapPosition } from '../enums/mini-map-position.enum';
import { ColorHelper } from '../utils/color.helper';
import { ViewDimensions } from '../utils/view-dimensions.helper';
import { VisibilityObserver } from '../utils/visibility-observer';
import * as i0 from "@angular/core";
/**
 * Matrix
 */
export interface Matrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}
export declare class GraphComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
    private el;
    zone: NgZone;
    cd: ChangeDetectorRef;
    private layoutService;
    nodes: Node[];
    clusters: ClusterNode[];
    links: Edge[];
    activeEntries: any[];
    curve: any;
    draggingEnabled: boolean;
    nodeHeight: number;
    nodeMaxHeight: number;
    nodeMinHeight: number;
    nodeWidth: number;
    nodeMinWidth: number;
    nodeMaxWidth: number;
    panningEnabled: boolean;
    panningAxis: PanningAxis;
    enableZoom: boolean;
    zoomSpeed: number;
    minZoomLevel: number;
    maxZoomLevel: number;
    autoZoom: boolean;
    panOnZoom: boolean;
    animate?: boolean;
    autoCenter: boolean;
    /** Margin applied around the drawing area on zoom to fit */
    zoomToFitMargin: {
        x: number;
        y: number;
    };
    update$: Observable<any>;
    center$: Observable<any>;
    zoomToFit$: Observable<any>;
    panToNode$: Observable<any>;
    layout: string | Layout;
    layoutSettings: any;
    enableTrackpadSupport: boolean;
    showMiniMap: boolean;
    miniMapMaxWidth: number;
    miniMapMaxHeight: number;
    miniMapPosition: MiniMapPosition;
    view: [number, number];
    scheme: any;
    customColors: any;
    animations: boolean;
    select: EventEmitter<any>;
    activate: EventEmitter<any>;
    deactivate: EventEmitter<any>;
    zoomChange: EventEmitter<number>;
    clickHandler: EventEmitter<MouseEvent>;
    linkTemplate: TemplateRef<any>;
    nodeTemplate: TemplateRef<any>;
    clusterTemplate: TemplateRef<any>;
    defsTemplate: TemplateRef<any>;
    miniMapNodeTemplate: TemplateRef<any>;
    nodeElements: QueryList<ElementRef>;
    linkElements: QueryList<ElementRef>;
    chartWidth: any;
    private isMouseMoveCalled;
    graphSubscription: Subscription;
    subscriptions: Subscription[];
    colors: ColorHelper;
    dims: ViewDimensions;
    seriesDomain: any;
    transform: string;
    isPanning: boolean;
    isDragging: boolean;
    draggingNode: Node;
    initialized: boolean;
    graph: Graph;
    graphDims: any;
    _oldLinks: Edge[];
    oldNodes: Set<string>;
    oldClusters: Set<string>;
    transformationMatrix: Matrix;
    _touchLastX: any;
    _touchLastY: any;
    minimapScaleCoefficient: number;
    minimapTransform: string;
    minimapOffsetX: number;
    minimapOffsetY: number;
    isMinimapPanning: boolean;
    minimapClipPathId: string;
    width: number;
    height: number;
    resizeSubscription: any;
    visibilityObserver: VisibilityObserver;
    constructor(el: ElementRef, zone: NgZone, cd: ChangeDetectorRef, layoutService: LayoutService);
    groupResultsBy: (node: any) => string;
    /**
     * Get the current zoom level
     */
    get zoomLevel(): number;
    /**
     * Set the current zoom level
     */
    set zoomLevel(level: number);
    /**
     * Get the current `x` position of the graph
     */
    get panOffsetX(): number;
    /**
     * Set the current `x` position of the graph
     */
    set panOffsetX(x: number);
    /**
     * Get the current `y` position of the graph
     */
    get panOffsetY(): number;
    /**
     * Set the current `y` position of the graph
     */
    set panOffsetY(y: number);
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngOnInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    setLayout(layout: string | Layout): void;
    setLayoutSettings(settings: any): void;
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngOnDestroy(): void;
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngAfterViewInit(): void;
    /**
     * Base class update implementation for the dag graph
     *
     * @memberOf GraphComponent
     */
    update(): void;
    /**
     * Creates the dagre graph engine
     *
     * @memberOf GraphComponent
     */
    createGraph(): void;
    /**
     * Draws the graph using dagre layouts
     *
     *
     * @memberOf GraphComponent
     */
    draw(): void;
    tick(): void;
    getMinimapTransform(): string;
    updateGraphDims(): void;
    updateMinimap(): void;
    /**
     * Measures the node element and applies the dimensions
     *
     * @memberOf GraphComponent
     */
    applyNodeDimensions(): void;
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @memberOf GraphComponent
     */
    redrawLines(_animate?: boolean): void;
    /**
     * Calculate the text directions / flipping
     *
     * @memberOf GraphComponent
     */
    calcDominantBaseline(link: any): void;
    /**
     * Generate the new line path
     *
     * @memberOf GraphComponent
     */
    generateLine(points: any): any;
    /**
     * Zoom was invoked from event
     *
     * @memberOf GraphComponent
     */
    onZoom($event: WheelEvent, direction: any): void;
    /**
     * Pan by x/y
     *
     * @param x
     * @param y
     */
    pan(x: number, y: number, ignoreZoomLevel?: boolean): void;
    /**
     * Pan to a fixed x/y
     *
     */
    panTo(x: number, y: number): void;
    /**
     * Zoom by a factor
     *
     */
    zoom(factor: number): void;
    /**
     * Zoom to a fixed level
     *
     */
    zoomTo(level: number): void;
    /**
     * Drag was invoked from an event
     *
     * @memberOf GraphComponent
     */
    onDrag(event: MouseEvent): void;
    redrawEdge(edge: Edge): void;
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf GraphComponent
     */
    updateTransform(): void;
    /**
     * Node was clicked
     *
     *
     * @memberOf GraphComponent
     */
    onClick(event: any): void;
    /**
     * Node was focused
     *
     *
     * @memberOf GraphComponent
     */
    onActivate(event: any): void;
    /**
     * Node was defocused
     *
     * @memberOf GraphComponent
     */
    onDeactivate(event: any): void;
    /**
     * Get the domain series for the nodes
     *
     * @memberOf GraphComponent
     */
    getSeriesDomain(): any[];
    /**
     * Tracking for the link
     *
     *
     * @memberOf GraphComponent
     */
    trackLinkBy(index: number, link: Edge): any;
    /**
     * Tracking for the node
     *
     *
     * @memberOf GraphComponent
     */
    trackNodeBy(index: number, node: Node): any;
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf GraphComponent
     */
    setColors(): void;
    /**
     * On mouse move event, used for panning and dragging.
     *
     * @memberOf GraphComponent
     */
    onMouseMove($event: MouseEvent): void;
    onMouseDown(event: MouseEvent): void;
    graphClick(event: MouseEvent): void;
    /**
     * On touch start event to enable panning.
     *
     * @memberOf GraphComponent
     */
    onTouchStart(event: any): void;
    /**
     * On touch move event, used for panning.
     *
     */
    onTouchMove($event: any): void;
    /**
     * On touch end event to disable panning.
     *
     * @memberOf GraphComponent
     */
    onTouchEnd(event: any): void;
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @memberOf GraphComponent
     */
    onMouseUp(event: MouseEvent): void;
    /**
     * On node mouse down to kick off dragging
     *
     * @memberOf GraphComponent
     */
    onNodeMouseDown(event: MouseEvent, node: any): void;
    /**
     * On minimap drag mouse down to kick off minimap panning
     *
     * @memberOf GraphComponent
     */
    onMinimapDragMouseDown(): void;
    /**
     * On minimap pan event. Pans the graph to the clicked position
     *
     * @memberOf GraphComponent
     */
    onMinimapPanTo(event: MouseEvent): void;
    /**
     * Center the graph in the viewport
     */
    center(): void;
    /**
     * Zooms to fit the entier graph
     */
    zoomToFit(): void;
    /**
     * Pans to the node
     * @param nodeId
     */
    panToNodeId(nodeId: string): void;
    private panWithConstraints;
    private updateMidpointOnEdge;
    basicUpdate(): void;
    getContainerDims(): any;
    protected unbindEvents(): void;
    private bindWindowResizeEvent;
    static ɵfac: i0.ɵɵFactoryDeclaration<GraphComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GraphComponent, "ngx-graph", never, { "nodes": "nodes"; "clusters": "clusters"; "links": "links"; "activeEntries": "activeEntries"; "curve": "curve"; "draggingEnabled": "draggingEnabled"; "nodeHeight": "nodeHeight"; "nodeMaxHeight": "nodeMaxHeight"; "nodeMinHeight": "nodeMinHeight"; "nodeWidth": "nodeWidth"; "nodeMinWidth": "nodeMinWidth"; "nodeMaxWidth": "nodeMaxWidth"; "panningEnabled": "panningEnabled"; "panningAxis": "panningAxis"; "enableZoom": "enableZoom"; "zoomSpeed": "zoomSpeed"; "minZoomLevel": "minZoomLevel"; "maxZoomLevel": "maxZoomLevel"; "autoZoom": "autoZoom"; "panOnZoom": "panOnZoom"; "animate": "animate"; "autoCenter": "autoCenter"; "zoomToFitMargin": "zoomToFitMargin"; "update$": "update$"; "center$": "center$"; "zoomToFit$": "zoomToFit$"; "panToNode$": "panToNode$"; "layout": "layout"; "layoutSettings": "layoutSettings"; "enableTrackpadSupport": "enableTrackpadSupport"; "showMiniMap": "showMiniMap"; "miniMapMaxWidth": "miniMapMaxWidth"; "miniMapMaxHeight": "miniMapMaxHeight"; "miniMapPosition": "miniMapPosition"; "view": "view"; "scheme": "scheme"; "customColors": "customColors"; "animations": "animations"; "groupResultsBy": "groupResultsBy"; "zoomLevel": "zoomLevel"; "panOffsetX": "panOffsetX"; "panOffsetY": "panOffsetY"; }, { "select": "select"; "activate": "activate"; "deactivate": "deactivate"; "zoomChange": "zoomChange"; "clickHandler": "clickHandler"; }, ["linkTemplate", "nodeTemplate", "clusterTemplate", "defsTemplate", "miniMapNodeTemplate"], ["*"], false>;
}
