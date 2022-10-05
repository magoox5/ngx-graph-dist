import { __decorate } from "tslib";
// rename transition due to conflict with d3 transition
import { animate, style, transition as ngTransition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, ContentChild, EventEmitter, HostListener, Input, Output, ViewChildren, ViewEncapsulation } from '@angular/core';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as ease from 'd3-ease';
import 'd3-transition';
import { Observable, Subscription, of, fromEvent as observableFromEvent } from 'rxjs';
import { first, debounceTime } from 'rxjs/operators';
import { identity, scale, smoothMatrix, toSVG, transform, translate } from 'transformation-matrix';
import { id } from '../utils/id';
import { PanningAxis } from '../enums/panning.enum';
import { MiniMapPosition } from '../enums/mini-map-position.enum';
import { throttleable } from '../utils/throttle';
import { ColorHelper } from '../utils/color.helper';
import { calculateViewDimensions } from '../utils/view-dimensions.helper';
import { VisibilityObserver } from '../utils/visibility-observer';
import * as i0 from "@angular/core";
import * as i1 from "./layouts/layout.service";
import * as i2 from "@angular/common";
import * as i3 from "./mouse-wheel.directive";
export class GraphComponent {
    constructor(el, zone, cd, layoutService) {
        this.el = el;
        this.zone = zone;
        this.cd = cd;
        this.layoutService = layoutService;
        this.nodes = [];
        this.clusters = [];
        this.links = [];
        this.activeEntries = [];
        this.draggingEnabled = true;
        this.panningEnabled = true;
        this.panningAxis = PanningAxis.Both;
        this.enableZoom = true;
        this.zoomSpeed = 0.1;
        this.minZoomLevel = 0.1;
        this.maxZoomLevel = 4.0;
        this.autoZoom = false;
        this.panOnZoom = true;
        this.animate = false;
        this.autoCenter = false;
        this.enableTrackpadSupport = false;
        this.showMiniMap = false;
        this.miniMapMaxWidth = 100;
        this.miniMapPosition = MiniMapPosition.UpperRight;
        this.scheme = 'cool';
        this.animations = true;
        this.select = new EventEmitter();
        this.activate = new EventEmitter();
        this.deactivate = new EventEmitter();
        this.zoomChange = new EventEmitter();
        this.clickHandler = new EventEmitter();
        this.isMouseMoveCalled = false;
        this.graphSubscription = new Subscription();
        this.subscriptions = [];
        this.isPanning = false;
        this.isDragging = false;
        this.initialized = false;
        this.graphDims = { width: 0, height: 0 };
        this._oldLinks = [];
        this.oldNodes = new Set();
        this.oldClusters = new Set();
        this.transformationMatrix = identity();
        this._touchLastX = null;
        this._touchLastY = null;
        this.minimapScaleCoefficient = 3;
        this.minimapOffsetX = 0;
        this.minimapOffsetY = 0;
        this.isMinimapPanning = false;
        this.groupResultsBy = node => node.label;
    }
    /**
     * Get the current zoom level
     */
    get zoomLevel() {
        return this.transformationMatrix.a;
    }
    /**
     * Set the current zoom level
     */
    set zoomLevel(level) {
        this.zoomTo(Number(level));
    }
    /**
     * Get the current `x` position of the graph
     */
    get panOffsetX() {
        return this.transformationMatrix.e;
    }
    /**
     * Set the current `x` position of the graph
     */
    set panOffsetX(x) {
        this.panTo(Number(x), null);
    }
    /**
     * Get the current `y` position of the graph
     */
    get panOffsetY() {
        return this.transformationMatrix.f;
    }
    /**
     * Set the current `y` position of the graph
     */
    set panOffsetY(y) {
        this.panTo(null, Number(y));
    }
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngOnInit() {
        if (this.update$) {
            this.subscriptions.push(this.update$.subscribe(() => {
                this.update();
            }));
        }
        if (this.center$) {
            this.subscriptions.push(this.center$.subscribe(() => {
                this.center();
            }));
        }
        if (this.zoomToFit$) {
            this.subscriptions.push(this.zoomToFit$.subscribe(() => {
                this.zoomToFit();
            }));
        }
        if (this.panToNode$) {
            this.subscriptions.push(this.panToNode$.subscribe((nodeId) => {
                this.panToNodeId(nodeId);
            }));
        }
        this.minimapClipPathId = `minimapClip${id()}`;
    }
    ngOnChanges(changes) {
        this.basicUpdate();
        const { layout, layoutSettings, nodes, clusters, links } = changes;
        this.setLayout(this.layout);
        if (layoutSettings) {
            this.setLayoutSettings(this.layoutSettings);
        }
        this.update();
    }
    setLayout(layout) {
        this.initialized = false;
        if (!layout) {
            layout = 'dagre';
        }
        if (typeof layout === 'string') {
            this.layout = this.layoutService.getLayout(layout);
            this.setLayoutSettings(this.layoutSettings);
        }
    }
    setLayoutSettings(settings) {
        if (this.layout && typeof this.layout !== 'string') {
            this.layout.settings = settings;
        }
    }
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngOnDestroy() {
        this.unbindEvents();
        if (this.visibilityObserver) {
            this.visibilityObserver.visible.unsubscribe();
            this.visibilityObserver.destroy();
        }
        for (const sub of this.subscriptions) {
            sub.unsubscribe();
        }
        this.subscriptions = null;
    }
    /**
     * Angular lifecycle event
     *
     *
     * @memberOf GraphComponent
     */
    ngAfterViewInit() {
        this.bindWindowResizeEvent();
        // listen for visibility of the element for hidden by default scenario
        this.visibilityObserver = new VisibilityObserver(this.el, this.zone);
        this.visibilityObserver.visible.subscribe(this.update.bind(this));
        setTimeout(() => this.update());
    }
    /**
     * Base class update implementation for the dag graph
     *
     * @memberOf GraphComponent
     */
    update() {
        this.basicUpdate();
        if (!this.curve) {
            this.curve = shape.curveBundle.beta(1);
        }
        this.zone.run(() => {
            this.dims = calculateViewDimensions({
                width: this.width,
                height: this.height
            });
            this.seriesDomain = this.getSeriesDomain();
            this.setColors();
            this.createGraph();
            this.updateTransform();
            this.initialized = true;
        });
    }
    /**
     * Creates the dagre graph engine
     *
     * @memberOf GraphComponent
     */
    createGraph() {
        this.graphSubscription.unsubscribe();
        this.graphSubscription = new Subscription();
        const initializeNode = (n) => {
            if (!n.meta) {
                n.meta = {};
            }
            if (!n.id) {
                n.id = id();
            }
            if (!n.dimension) {
                n.dimension = {
                    width: this.nodeWidth ? this.nodeWidth : 30,
                    height: this.nodeHeight ? this.nodeHeight : 30
                };
                n.meta.forceDimensions = false;
            }
            else {
                n.meta.forceDimensions = n.meta.forceDimensions === undefined ? true : n.meta.forceDimensions;
            }
            if (!n.position) {
                n.position = {
                    x: 0,
                    y: 0
                };
            }
            n.data = n.data ? n.data : {};
            return n;
        };
        this.graph = {
            nodes: this.nodes.length > 0 ? [...this.nodes].map(initializeNode) : [],
            clusters: this.clusters && this.clusters.length > 0 ? [...this.clusters].map(initializeNode) : [],
            edges: this.links.length > 0
                ? [...this.links].map(e => {
                    if (!e.id) {
                        e.id = id();
                    }
                    return e;
                })
                : []
        };
        requestAnimationFrame(() => this.draw());
    }
    /**
     * Draws the graph using dagre layouts
     *
     *
     * @memberOf GraphComponent
     */
    draw() {
        if (!this.layout || typeof this.layout === 'string') {
            return;
        }
        // Calc view dims for the nodes
        this.applyNodeDimensions();
        // Recalc the layout
        const result = this.layout.run(this.graph);
        const result$ = result instanceof Observable ? result : of(result);
        this.graphSubscription.add(result$.subscribe(graph => {
            this.graph = graph;
            this.tick();
        }));
        if (this.graph.nodes.length === 0) {
            return;
        }
        result$.pipe(first()).subscribe(() => this.applyNodeDimensions());
    }
    tick() {
        // Transposes view options to the node
        const oldNodes = new Set();
        this.graph.nodes.map(n => {
            n.transform = `translate(${n.position.x - n.dimension.width / 2 || 0}, ${n.position.y - n.dimension.height / 2 || 0})`;
            if (!n.data) {
                n.data = {};
            }
            n.data.color = this.colors.getColor(this.groupResultsBy(n));
            oldNodes.add(n.id);
        });
        const oldClusters = new Set();
        (this.graph.clusters || []).map(n => {
            n.transform = `translate(${n.position.x - n.dimension.width / 2 || 0}, ${n.position.y - n.dimension.height / 2 || 0})`;
            if (!n.data) {
                n.data = {};
            }
            n.data.color = this.colors.getColor(this.groupResultsBy(n));
            oldClusters.add(n.id);
        });
        // Prevent animations on new nodes
        setTimeout(() => {
            this.oldNodes = oldNodes;
            this.oldClusters = oldClusters;
        }, 500);
        // Update the labels to the new positions
        const newLinks = [];
        for (const edgeLabelId in this.graph.edgeLabels) {
            const edgeLabel = this.graph.edgeLabels[edgeLabelId];
            const normKey = edgeLabelId.replace(/[^\w-]*/g, '');
            const isMultigraph = this.layout && typeof this.layout !== 'string' && this.layout.settings && this.layout.settings.multigraph;
            let oldLink = isMultigraph
                ? this._oldLinks.find(ol => `${ol.source}${ol.target}${ol.id}` === normKey)
                : this._oldLinks.find(ol => `${ol.source}${ol.target}` === normKey);
            const linkFromGraph = isMultigraph
                ? this.graph.edges.find(nl => `${nl.source}${nl.target}${nl.id}` === normKey)
                : this.graph.edges.find(nl => `${nl.source}${nl.target}` === normKey);
            if (!oldLink) {
                oldLink = linkFromGraph || edgeLabel;
            }
            else if (oldLink.data &&
                linkFromGraph &&
                linkFromGraph.data &&
                JSON.stringify(oldLink.data) !== JSON.stringify(linkFromGraph.data)) {
                // Compare old link to new link and replace if not equal
                oldLink.data = linkFromGraph.data;
            }
            oldLink.oldLine = oldLink.line;
            const points = edgeLabel.points;
            const line = this.generateLine(points);
            const newLink = Object.assign({}, oldLink);
            newLink.line = line;
            newLink.points = points;
            this.updateMidpointOnEdge(newLink, points);
            const textPos = points[Math.floor(points.length / 2)];
            if (textPos) {
                newLink.textTransform = `translate(${textPos.x || 0},${textPos.y || 0})`;
            }
            newLink.textAngle = 0;
            if (!newLink.oldLine) {
                newLink.oldLine = newLink.line;
            }
            this.calcDominantBaseline(newLink);
            newLinks.push(newLink);
        }
        this.graph.edges = newLinks;
        // Map the old links for animations
        if (this.graph.edges) {
            this._oldLinks = this.graph.edges.map(l => {
                const newL = Object.assign({}, l);
                newL.oldLine = l.line;
                return newL;
            });
        }
        this.updateMinimap();
        if (this.autoZoom) {
            this.zoomToFit();
        }
        if (this.autoCenter) {
            // Auto-center when rendering
            this.center();
        }
        requestAnimationFrame(() => this.redrawLines());
        this.cd.markForCheck();
    }
    getMinimapTransform() {
        switch (this.miniMapPosition) {
            case MiniMapPosition.UpperLeft: {
                return '';
            }
            case MiniMapPosition.UpperRight: {
                return 'translate(' + (this.dims.width - this.graphDims.width / this.minimapScaleCoefficient) + ',' + 0 + ')';
            }
            default: {
                return '';
            }
        }
    }
    updateGraphDims() {
        let minX = +Infinity;
        let maxX = -Infinity;
        let minY = +Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < this.graph.nodes.length; i++) {
            const node = this.graph.nodes[i];
            minX = node.position.x < minX ? node.position.x : minX;
            minY = node.position.y < minY ? node.position.y : minY;
            maxX = node.position.x + node.dimension.width > maxX ? node.position.x + node.dimension.width : maxX;
            maxY = node.position.y + node.dimension.height > maxY ? node.position.y + node.dimension.height : maxY;
        }
        // When clusters are present, leave room around the graph
        // to account for height and width they can add to the dimensions.
        // Iterating through the graph clusters and min/maxing
        // their position and dimension didn't work.
        // The graph calculated size was still too low and some nodes
        // were rendered outside of the view when using zoomToFit.
        // Without clusters, using dagre, the extra spacing all around
        // causes the graph to be shifted up/left instead of being centered.
        if (this.graph.clusters.length > 0) {
            minX -= 100;
            minY -= 100;
            maxX += 100;
            maxY += 100;
        }
        this.graphDims.width = maxX - minX;
        this.graphDims.height = maxY - minY;
        this.minimapOffsetX = minX;
        this.minimapOffsetY = minY;
    }
    updateMinimap() {
        // Calculate the height/width total, but only if we have any nodes
        if (this.graph.nodes && this.graph.nodes.length) {
            this.updateGraphDims();
            if (this.miniMapMaxWidth) {
                this.minimapScaleCoefficient = this.graphDims.width / this.miniMapMaxWidth;
            }
            if (this.miniMapMaxHeight) {
                this.minimapScaleCoefficient = Math.max(this.minimapScaleCoefficient, this.graphDims.height / this.miniMapMaxHeight);
            }
            this.minimapTransform = this.getMinimapTransform();
        }
    }
    /**
     * Measures the node element and applies the dimensions
     *
     * @memberOf GraphComponent
     */
    applyNodeDimensions() {
        if (this.nodeElements && this.nodeElements.length) {
            this.nodeElements.map(elem => {
                const nativeElement = elem.nativeElement;
                const node = this.graph.nodes.find(n => n.id === nativeElement.id);
                if (!node) {
                    return;
                }
                // calculate the height
                let dims;
                try {
                    dims = nativeElement.getBBox();
                    if (!dims.width || !dims.height) {
                        return;
                    }
                }
                catch (ex) {
                    // Skip drawing if element is not displayed - Firefox would throw an error here
                    return;
                }
                if (this.nodeHeight) {
                    node.dimension.height =
                        node.dimension.height && node.meta.forceDimensions ? node.dimension.height : this.nodeHeight;
                }
                else {
                    node.dimension.height =
                        node.dimension.height && node.meta.forceDimensions ? node.dimension.height : dims.height;
                }
                if (this.nodeMaxHeight) {
                    node.dimension.height = Math.max(node.dimension.height, this.nodeMaxHeight);
                }
                if (this.nodeMinHeight) {
                    node.dimension.height = Math.min(node.dimension.height, this.nodeMinHeight);
                }
                if (this.nodeWidth) {
                    node.dimension.width =
                        node.dimension.width && node.meta.forceDimensions ? node.dimension.width : this.nodeWidth;
                }
                else {
                    // calculate the width
                    if (nativeElement.getElementsByTagName('text').length) {
                        let maxTextDims;
                        try {
                            for (const textElem of nativeElement.getElementsByTagName('text')) {
                                const currentBBox = textElem.getBBox();
                                if (!maxTextDims) {
                                    maxTextDims = currentBBox;
                                }
                                else {
                                    if (currentBBox.width > maxTextDims.width) {
                                        maxTextDims.width = currentBBox.width;
                                    }
                                    if (currentBBox.height > maxTextDims.height) {
                                        maxTextDims.height = currentBBox.height;
                                    }
                                }
                            }
                        }
                        catch (ex) {
                            // Skip drawing if element is not displayed - Firefox would throw an error here
                            return;
                        }
                        node.dimension.width =
                            node.dimension.width && node.meta.forceDimensions ? node.dimension.width : maxTextDims.width + 20;
                    }
                    else {
                        node.dimension.width =
                            node.dimension.width && node.meta.forceDimensions ? node.dimension.width : dims.width;
                    }
                }
                if (this.nodeMaxWidth) {
                    node.dimension.width = Math.max(node.dimension.width, this.nodeMaxWidth);
                }
                if (this.nodeMinWidth) {
                    node.dimension.width = Math.min(node.dimension.width, this.nodeMinWidth);
                }
            });
        }
    }
    /**
     * Redraws the lines when dragged or viewport updated
     *
     * @memberOf GraphComponent
     */
    redrawLines(_animate = this.animate) {
        this.linkElements.map(linkEl => {
            const edge = this.graph.edges.find(lin => lin.id === linkEl.nativeElement.id);
            if (edge) {
                const linkSelection = select(linkEl.nativeElement).select('.line');
                linkSelection
                    .attr('d', edge.oldLine)
                    .transition()
                    .ease(ease.easeSinInOut)
                    .duration(_animate ? 500 : 0)
                    .attr('d', edge.line);
                const textPathSelection = select(this.el.nativeElement).select(`#${edge.id}`);
                textPathSelection
                    .attr('d', edge.oldTextPath)
                    .transition()
                    .ease(ease.easeSinInOut)
                    .duration(_animate ? 500 : 0)
                    .attr('d', edge.textPath);
                this.updateMidpointOnEdge(edge, edge.points);
            }
        });
    }
    /**
     * Calculate the text directions / flipping
     *
     * @memberOf GraphComponent
     */
    calcDominantBaseline(link) {
        const firstPoint = link.points[0];
        const lastPoint = link.points[link.points.length - 1];
        link.oldTextPath = link.textPath;
        if (lastPoint.x < firstPoint.x) {
            link.dominantBaseline = 'text-before-edge';
            // reverse text path for when its flipped upside down
            link.textPath = this.generateLine([...link.points].reverse());
        }
        else {
            link.dominantBaseline = 'text-after-edge';
            link.textPath = link.line;
        }
    }
    /**
     * Generate the new line path
     *
     * @memberOf GraphComponent
     */
    generateLine(points) {
        const lineFunction = shape
            .line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(this.curve);
        return lineFunction(points);
    }
    /**
     * Zoom was invoked from event
     *
     * @memberOf GraphComponent
     */
    onZoom($event, direction) {
        if (this.enableTrackpadSupport && !$event.ctrlKey) {
            this.pan($event.deltaX * -1, $event.deltaY * -1);
            return;
        }
        const zoomFactor = 1 + (direction === 'in' ? this.zoomSpeed : -this.zoomSpeed);
        // Check that zooming wouldn't put us out of bounds
        const newZoomLevel = this.zoomLevel * zoomFactor;
        if (newZoomLevel <= this.minZoomLevel || newZoomLevel >= this.maxZoomLevel) {
            return;
        }
        // Check if zooming is enabled or not
        if (!this.enableZoom) {
            return;
        }
        if (this.panOnZoom === true && $event) {
            // Absolute mouse X/Y on the screen
            const mouseX = $event.clientX;
            const mouseY = $event.clientY;
            // Transform the mouse X/Y into a SVG X/Y
            const svg = this.el.nativeElement.querySelector('svg');
            const svgGroup = svg.querySelector('g.chart');
            const point = svg.createSVGPoint();
            point.x = mouseX;
            point.y = mouseY;
            const svgPoint = point.matrixTransform(svgGroup.getScreenCTM().inverse());
            // Panzoom
            this.pan(svgPoint.x, svgPoint.y, true);
            this.zoom(zoomFactor);
            this.pan(-svgPoint.x, -svgPoint.y, true);
        }
        else {
            this.zoom(zoomFactor);
        }
    }
    /**
     * Pan by x/y
     *
     * @param x
     * @param y
     */
    pan(x, y, ignoreZoomLevel = false) {
        const zoomLevel = ignoreZoomLevel ? 1 : this.zoomLevel;
        this.transformationMatrix = transform(this.transformationMatrix, translate(x / zoomLevel, y / zoomLevel));
        this.updateTransform();
    }
    /**
     * Pan to a fixed x/y
     *
     */
    panTo(x, y) {
        if (x === null || x === undefined || isNaN(x) || y === null || y === undefined || isNaN(y)) {
            return;
        }
        const panX = -this.panOffsetX - x * this.zoomLevel + this.dims.width / 2;
        const panY = -this.panOffsetY - y * this.zoomLevel + this.dims.height / 2;
        this.transformationMatrix = transform(this.transformationMatrix, translate(panX / this.zoomLevel, panY / this.zoomLevel));
        this.updateTransform();
    }
    /**
     * Zoom by a factor
     *
     */
    zoom(factor) {
        this.transformationMatrix = transform(this.transformationMatrix, scale(factor, factor));
        this.zoomChange.emit(this.zoomLevel);
        this.updateTransform();
    }
    /**
     * Zoom to a fixed level
     *
     */
    zoomTo(level) {
        this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
        this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);
        this.zoomChange.emit(this.zoomLevel);
        this.updateTransform();
        this.update();
    }
    /**
     * Drag was invoked from an event
     *
     * @memberOf GraphComponent
     */
    onDrag(event) {
        if (!this.draggingEnabled) {
            return;
        }
        const node = this.draggingNode;
        if (this.layout && typeof this.layout !== 'string' && this.layout.onDrag) {
            this.layout.onDrag(node, event);
        }
        node.position.x += event.movementX / this.zoomLevel;
        node.position.y += event.movementY / this.zoomLevel;
        // move the node
        const x = node.position.x - node.dimension.width / 2;
        const y = node.position.y - node.dimension.height / 2;
        node.transform = `translate(${x}, ${y})`;
        for (const link of this.graph.edges) {
            if (link.target === node.id ||
                link.source === node.id ||
                link.target.id === node.id ||
                link.source.id === node.id) {
                if (this.layout && typeof this.layout !== 'string') {
                    const result = this.layout.updateEdge(this.graph, link);
                    const result$ = result instanceof Observable ? result : of(result);
                    this.graphSubscription.add(result$.subscribe(graph => {
                        this.graph = graph;
                        this.redrawEdge(link);
                    }));
                }
            }
        }
        this.redrawLines(false);
        this.updateMinimap();
    }
    redrawEdge(edge) {
        const line = this.generateLine(edge.points);
        this.calcDominantBaseline(edge);
        edge.oldLine = edge.line;
        edge.line = line;
    }
    /**
     * Update the entire view for the new pan position
     *
     *
     * @memberOf GraphComponent
     */
    updateTransform() {
        this.transform = toSVG(smoothMatrix(this.transformationMatrix, 100));
    }
    /**
     * Node was clicked
     *
     *
     * @memberOf GraphComponent
     */
    onClick(event) {
        this.select.emit(event);
    }
    /**
     * Node was focused
     *
     *
     * @memberOf GraphComponent
     */
    onActivate(event) {
        if (this.activeEntries.indexOf(event) > -1) {
            return;
        }
        this.activeEntries = [event, ...this.activeEntries];
        this.activate.emit({ value: event, entries: this.activeEntries });
    }
    /**
     * Node was defocused
     *
     * @memberOf GraphComponent
     */
    onDeactivate(event) {
        const idx = this.activeEntries.indexOf(event);
        this.activeEntries.splice(idx, 1);
        this.activeEntries = [...this.activeEntries];
        this.deactivate.emit({ value: event, entries: this.activeEntries });
    }
    /**
     * Get the domain series for the nodes
     *
     * @memberOf GraphComponent
     */
    getSeriesDomain() {
        return this.nodes
            .map(d => this.groupResultsBy(d))
            .reduce((nodes, node) => (nodes.indexOf(node) !== -1 ? nodes : nodes.concat([node])), [])
            .sort();
    }
    /**
     * Tracking for the link
     *
     *
     * @memberOf GraphComponent
     */
    trackLinkBy(index, link) {
        return link.id;
    }
    /**
     * Tracking for the node
     *
     *
     * @memberOf GraphComponent
     */
    trackNodeBy(index, node) {
        return node.id;
    }
    /**
     * Sets the colors the nodes
     *
     *
     * @memberOf GraphComponent
     */
    setColors() {
        this.colors = new ColorHelper(this.scheme, this.seriesDomain, this.customColors);
    }
    /**
     * On mouse move event, used for panning and dragging.
     *
     * @memberOf GraphComponent
     */
    onMouseMove($event) {
        this.isMouseMoveCalled = true;
        if ((this.isPanning || this.isMinimapPanning) && this.panningEnabled) {
            this.panWithConstraints(this.panningAxis, $event);
        }
        else if (this.isDragging && this.draggingEnabled) {
            this.onDrag($event);
        }
    }
    onMouseDown(event) {
        this.isMouseMoveCalled = false;
    }
    graphClick(event) {
        if (!this.isMouseMoveCalled)
            this.clickHandler.emit(event);
    }
    /**
     * On touch start event to enable panning.
     *
     * @memberOf GraphComponent
     */
    onTouchStart(event) {
        this._touchLastX = event.changedTouches[0].clientX;
        this._touchLastY = event.changedTouches[0].clientY;
        this.isPanning = true;
    }
    /**
     * On touch move event, used for panning.
     *
     */
    onTouchMove($event) {
        if (this.isPanning && this.panningEnabled) {
            const clientX = $event.changedTouches[0].clientX;
            const clientY = $event.changedTouches[0].clientY;
            const movementX = clientX - this._touchLastX;
            const movementY = clientY - this._touchLastY;
            this._touchLastX = clientX;
            this._touchLastY = clientY;
            this.pan(movementX, movementY);
        }
    }
    /**
     * On touch end event to disable panning.
     *
     * @memberOf GraphComponent
     */
    onTouchEnd(event) {
        this.isPanning = false;
    }
    /**
     * On mouse up event to disable panning/dragging.
     *
     * @memberOf GraphComponent
     */
    onMouseUp(event) {
        this.isDragging = false;
        this.isPanning = false;
        this.isMinimapPanning = false;
        if (this.layout && typeof this.layout !== 'string' && this.layout.onDragEnd) {
            this.layout.onDragEnd(this.draggingNode, event);
        }
    }
    /**
     * On node mouse down to kick off dragging
     *
     * @memberOf GraphComponent
     */
    onNodeMouseDown(event, node) {
        if (!this.draggingEnabled) {
            return;
        }
        this.isDragging = true;
        this.draggingNode = node;
        if (this.layout && typeof this.layout !== 'string' && this.layout.onDragStart) {
            this.layout.onDragStart(node, event);
        }
    }
    /**
     * On minimap drag mouse down to kick off minimap panning
     *
     * @memberOf GraphComponent
     */
    onMinimapDragMouseDown() {
        this.isMinimapPanning = true;
    }
    /**
     * On minimap pan event. Pans the graph to the clicked position
     *
     * @memberOf GraphComponent
     */
    onMinimapPanTo(event) {
        const x = event.offsetX - (this.dims.width - (this.graphDims.width + this.minimapOffsetX) / this.minimapScaleCoefficient);
        const y = event.offsetY + this.minimapOffsetY / this.minimapScaleCoefficient;
        this.panTo(x * this.minimapScaleCoefficient, y * this.minimapScaleCoefficient);
        this.isMinimapPanning = true;
    }
    /**
     * Center the graph in the viewport
     */
    center() {
        this.panTo(this.graphDims.width / 2, this.graphDims.height / 2);
    }
    /**
     * Zooms to fit the entier graph
     */
    zoomToFit() {
        const margin = {
            x: this.zoomToFitMargin?.x || 0,
            y: this.zoomToFitMargin?.y || 0,
        };
        // Margin value is x2 for top/bottom and left/right
        const heightZoom = this.dims.height / (this.graphDims.height + margin.y * 2);
        const widthZoom = this.dims.width / (this.graphDims.width + margin.x * 2);
        let zoomLevel = Math.min(heightZoom, widthZoom, 1);
        if (zoomLevel < this.minZoomLevel) {
            zoomLevel = this.minZoomLevel;
        }
        if (zoomLevel > this.maxZoomLevel) {
            zoomLevel = this.maxZoomLevel;
        }
        if (zoomLevel !== this.zoomLevel) {
            this.zoomLevel = zoomLevel;
            this.updateTransform();
            this.zoomChange.emit(this.zoomLevel);
        }
    }
    /**
     * Pans to the node
     * @param nodeId
     */
    panToNodeId(nodeId) {
        const node = this.graph.nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }
        this.panTo(node.position.x, node.position.y);
    }
    panWithConstraints(key, event) {
        let x = event.movementX;
        let y = event.movementY;
        if (this.isMinimapPanning) {
            x = -this.minimapScaleCoefficient * x * this.zoomLevel;
            y = -this.minimapScaleCoefficient * y * this.zoomLevel;
        }
        switch (key) {
            case PanningAxis.Horizontal:
                this.pan(x, 0);
                break;
            case PanningAxis.Vertical:
                this.pan(0, y);
                break;
            default:
                this.pan(x, y);
                break;
        }
    }
    updateMidpointOnEdge(edge, points) {
        if (!edge || !points) {
            return;
        }
        if (points.length % 2 === 1) {
            edge.midPoint = points[Math.floor(points.length / 2)];
        }
        else {
            const _first = points[points.length / 2];
            const _second = points[points.length / 2 - 1];
            edge.midPoint = {
                x: (_first.x + _second.x) / 2,
                y: (_first.y + _second.y) / 2
            };
        }
    }
    basicUpdate() {
        if (this.view) {
            this.width = this.view[0];
            this.height = this.view[1];
        }
        else {
            const dims = this.getContainerDims();
            if (dims) {
                this.width = dims.width;
                this.height = dims.height;
            }
        }
        // default values if width or height are 0 or undefined
        if (!this.width) {
            this.width = 600;
        }
        if (!this.height) {
            this.height = 400;
        }
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);
        if (this.cd) {
            this.cd.markForCheck();
        }
    }
    getContainerDims() {
        let width;
        let height;
        const hostElem = this.el.nativeElement;
        if (hostElem.parentNode !== null) {
            // Get the container dimensions
            const dims = hostElem.parentNode.getBoundingClientRect();
            width = dims.width;
            height = dims.height;
        }
        if (width && height) {
            return { width, height };
        }
        return null;
    }
    unbindEvents() {
        if (this.resizeSubscription) {
            this.resizeSubscription.unsubscribe();
        }
    }
    bindWindowResizeEvent() {
        const source = observableFromEvent(window, 'resize');
        const subscription = source.pipe(debounceTime(200)).subscribe(e => {
            this.update();
            if (this.cd) {
                this.cd.markForCheck();
            }
        });
        this.resizeSubscription = subscription;
    }
}
GraphComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: GraphComponent, deps: [{ token: i0.ElementRef }, { token: i0.NgZone }, { token: i0.ChangeDetectorRef }, { token: i1.LayoutService }], target: i0.ɵɵFactoryTarget.Component });
GraphComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.2.5", type: GraphComponent, selector: "ngx-graph", inputs: { nodes: "nodes", clusters: "clusters", links: "links", activeEntries: "activeEntries", curve: "curve", draggingEnabled: "draggingEnabled", nodeHeight: "nodeHeight", nodeMaxHeight: "nodeMaxHeight", nodeMinHeight: "nodeMinHeight", nodeWidth: "nodeWidth", nodeMinWidth: "nodeMinWidth", nodeMaxWidth: "nodeMaxWidth", panningEnabled: "panningEnabled", panningAxis: "panningAxis", enableZoom: "enableZoom", zoomSpeed: "zoomSpeed", minZoomLevel: "minZoomLevel", maxZoomLevel: "maxZoomLevel", autoZoom: "autoZoom", panOnZoom: "panOnZoom", animate: "animate", autoCenter: "autoCenter", zoomToFitMargin: "zoomToFitMargin", update$: "update$", center$: "center$", zoomToFit$: "zoomToFit$", panToNode$: "panToNode$", layout: "layout", layoutSettings: "layoutSettings", enableTrackpadSupport: "enableTrackpadSupport", showMiniMap: "showMiniMap", miniMapMaxWidth: "miniMapMaxWidth", miniMapMaxHeight: "miniMapMaxHeight", miniMapPosition: "miniMapPosition", view: "view", scheme: "scheme", customColors: "customColors", animations: "animations", groupResultsBy: "groupResultsBy", zoomLevel: "zoomLevel", panOffsetX: "panOffsetX", panOffsetY: "panOffsetY" }, outputs: { select: "select", activate: "activate", deactivate: "deactivate", zoomChange: "zoomChange", clickHandler: "clickHandler" }, host: { listeners: { "document:mousemove": "onMouseMove($event)", "document:mousedown": "onMouseDown($event)", "document:click": "graphClick($event)", "document:touchmove": "onTouchMove($event)", "document:mouseup": "onMouseUp($event)" } }, queries: [{ propertyName: "linkTemplate", first: true, predicate: ["linkTemplate"], descendants: true }, { propertyName: "nodeTemplate", first: true, predicate: ["nodeTemplate"], descendants: true }, { propertyName: "clusterTemplate", first: true, predicate: ["clusterTemplate"], descendants: true }, { propertyName: "defsTemplate", first: true, predicate: ["defsTemplate"], descendants: true }, { propertyName: "miniMapNodeTemplate", first: true, predicate: ["miniMapNodeTemplate"], descendants: true }], viewQueries: [{ propertyName: "nodeElements", predicate: ["nodeElement"], descendants: true }, { propertyName: "linkElements", predicate: ["linkElement"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<div\n  class=\"ngx-charts-outer\"\n  [style.width.px]=\"width\"\n  [@animationState]=\"'active'\"\n  [@.disabled]=\"!animations\"\n  (mouseWheelUp)=\"onZoom($event, 'in')\"\n  (mouseWheelDown)=\"onZoom($event, 'out')\"\n  mouseWheel\n>\n  <svg:svg class=\"ngx-charts\" [attr.width]=\"width\" [attr.height]=\"height\">\n    <svg:g\n      *ngIf=\"initialized && graph\"\n      [attr.transform]=\"transform\"\n      (touchstart)=\"onTouchStart($event)\"\n      (touchend)=\"onTouchEnd($event)\"\n      class=\"graph chart\"\n    >\n      <defs>\n        <ng-container *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\"></ng-container>\n        <svg:path\n          class=\"text-path\"\n          *ngFor=\"let link of graph.edges\"\n          [attr.d]=\"link.textPath\"\n          [attr.id]=\"link.id\"\n        ></svg:path>\n      </defs>\n\n      <svg:rect\n        class=\"panning-rect\"\n        [attr.width]=\"dims.width * 100\"\n        [attr.height]=\"dims.height * 100\"\n        [attr.transform]=\"'translate(' + (-dims.width || 0) * 50 + ',' + (-dims.height || 0) * 50 + ')'\"\n        (mousedown)=\"isPanning = true\"\n      />\n\n      <ng-content></ng-content>\n\n      <svg:g class=\"clusters\">\n        <svg:g\n          #clusterElement\n          *ngFor=\"let node of graph.clusters; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldClusters.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n        >\n          <ng-container\n            *ngIf=\"clusterTemplate\"\n            [ngTemplateOutlet]=\"clusterTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:g *ngIf=\"!clusterTemplate\" class=\"node cluster\">\n            <svg:rect\n              [attr.width]=\"node.dimension.width\"\n              [attr.height]=\"node.dimension.height\"\n              [attr.fill]=\"node.data?.color\"\n            />\n            <svg:text alignment-baseline=\"central\" [attr.x]=\"10\" [attr.y]=\"node.dimension.height / 2\">\n              {{ node.label }}\n            </svg:text>\n          </svg:g>\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"links\">\n        <svg:g #linkElement *ngFor=\"let link of graph.edges; trackBy: trackLinkBy\" class=\"link-group\" [id]=\"link.id\">\n          <ng-container\n            *ngIf=\"linkTemplate\"\n            [ngTemplateOutlet]=\"linkTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: link }\"\n          ></ng-container>\n          <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"nodes\">\n        <svg:g\n          #nodeElement\n          *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldNodes.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n          (mousedown)=\"onNodeMouseDown($event, node)\"\n        >\n          <ng-container\n            *ngIf=\"nodeTemplate\"\n            [ngTemplateOutlet]=\"nodeTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:circle\n            *ngIf=\"!nodeTemplate\"\n            r=\"10\"\n            [attr.cx]=\"node.dimension.width / 2\"\n            [attr.cy]=\"node.dimension.height / 2\"\n            [attr.fill]=\"node.data?.color\"\n          />\n        </svg:g>\n      </svg:g>\n    </svg:g>\n\n    <svg:clipPath [attr.id]=\"minimapClipPathId\">\n      <svg:rect\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n      ></svg:rect>\n    </svg:clipPath>\n\n    <svg:g\n      class=\"minimap\"\n      *ngIf=\"showMiniMap\"\n      [attr.transform]=\"minimapTransform\"\n      [attr.clip-path]=\"'url(#' + minimapClipPathId + ')'\"\n    >\n      <svg:rect\n        class=\"minimap-background\"\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n        (mousedown)=\"onMinimapPanTo($event)\"\n      ></svg:rect>\n\n      <svg:g\n        [style.transform]=\"\n          'translate(' +\n          -minimapOffsetX / minimapScaleCoefficient +\n          'px,' +\n          -minimapOffsetY / minimapScaleCoefficient +\n          'px)'\n        \"\n      >\n        <svg:g class=\"minimap-nodes\" [style.transform]=\"'scale(' + 1 / minimapScaleCoefficient + ')'\">\n          <svg:g\n            #nodeElement\n            *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n            class=\"node-group\"\n            [class.old-node]=\"animate && oldNodes.has(node.id)\"\n            [id]=\"node.id\"\n            [attr.transform]=\"node.transform\"\n          >\n            <ng-container\n              *ngIf=\"miniMapNodeTemplate\"\n              [ngTemplateOutlet]=\"miniMapNodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <ng-container\n              *ngIf=\"!miniMapNodeTemplate && nodeTemplate\"\n              [ngTemplateOutlet]=\"nodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <svg:circle\n              *ngIf=\"!nodeTemplate && !miniMapNodeTemplate\"\n              r=\"10\"\n              [attr.cx]=\"node.dimension.width / 2 / minimapScaleCoefficient\"\n              [attr.cy]=\"node.dimension.height / 2 / minimapScaleCoefficient\"\n              [attr.fill]=\"node.data?.color\"\n            />\n          </svg:g>\n        </svg:g>\n\n        <svg:rect\n          [attr.transform]=\"\n            'translate(' +\n            panOffsetX / zoomLevel / -minimapScaleCoefficient +\n            ',' +\n            panOffsetY / zoomLevel / -minimapScaleCoefficient +\n            ')'\n          \"\n          class=\"minimap-drag\"\n          [class.panning]=\"isMinimapPanning\"\n          [attr.width]=\"width / minimapScaleCoefficient / zoomLevel\"\n          [attr.height]=\"height / minimapScaleCoefficient / zoomLevel\"\n          (mousedown)=\"onMinimapDragMouseDown()\"\n        ></svg:rect>\n      </svg:g>\n    </svg:g>\n  </svg:svg>\n</div>\n", styles: [".minimap .minimap-background{fill:#0000001a}.minimap .minimap-drag{fill:#0003;stroke:#fff;stroke-width:1px;stroke-dasharray:2px;stroke-dashoffset:2px;cursor:pointer}.minimap .minimap-drag.panning{fill:#0000004d}.minimap .minimap-nodes{opacity:.5;pointer-events:none}.graph{-webkit-user-select:none;user-select:none}.graph .edge{stroke:#666;fill:none}.graph .edge .edge-label{stroke:none;font-size:12px;fill:#251e1e}.graph .panning-rect{fill:#0000;cursor:move}.graph .node-group.old-node{transition:transform .5s ease-in-out}.graph .node-group .node:focus{outline:none}.graph .cluster rect{opacity:.2}\n"], dependencies: [{ kind: "directive", type: i2.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: i2.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i2.NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }, { kind: "directive", type: i3.MouseWheelDirective, selector: "[mouseWheel]", outputs: ["mouseWheelUp", "mouseWheelDown"] }], animations: [
        trigger('animationState', [
            ngTransition(':enter', [style({ opacity: 0 }), animate('500ms 100ms', style({ opacity: 1 }))])
        ])
    ], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
__decorate([
    throttleable(500)
], GraphComponent.prototype, "updateMinimap", null);
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.5", ngImport: i0, type: GraphComponent, decorators: [{
            type: Component,
            args: [{ selector: 'ngx-graph', encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, animations: [
                        trigger('animationState', [
                            ngTransition(':enter', [style({ opacity: 0 }), animate('500ms 100ms', style({ opacity: 1 }))])
                        ])
                    ], template: "<div\n  class=\"ngx-charts-outer\"\n  [style.width.px]=\"width\"\n  [@animationState]=\"'active'\"\n  [@.disabled]=\"!animations\"\n  (mouseWheelUp)=\"onZoom($event, 'in')\"\n  (mouseWheelDown)=\"onZoom($event, 'out')\"\n  mouseWheel\n>\n  <svg:svg class=\"ngx-charts\" [attr.width]=\"width\" [attr.height]=\"height\">\n    <svg:g\n      *ngIf=\"initialized && graph\"\n      [attr.transform]=\"transform\"\n      (touchstart)=\"onTouchStart($event)\"\n      (touchend)=\"onTouchEnd($event)\"\n      class=\"graph chart\"\n    >\n      <defs>\n        <ng-container *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\"></ng-container>\n        <svg:path\n          class=\"text-path\"\n          *ngFor=\"let link of graph.edges\"\n          [attr.d]=\"link.textPath\"\n          [attr.id]=\"link.id\"\n        ></svg:path>\n      </defs>\n\n      <svg:rect\n        class=\"panning-rect\"\n        [attr.width]=\"dims.width * 100\"\n        [attr.height]=\"dims.height * 100\"\n        [attr.transform]=\"'translate(' + (-dims.width || 0) * 50 + ',' + (-dims.height || 0) * 50 + ')'\"\n        (mousedown)=\"isPanning = true\"\n      />\n\n      <ng-content></ng-content>\n\n      <svg:g class=\"clusters\">\n        <svg:g\n          #clusterElement\n          *ngFor=\"let node of graph.clusters; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldClusters.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n        >\n          <ng-container\n            *ngIf=\"clusterTemplate\"\n            [ngTemplateOutlet]=\"clusterTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:g *ngIf=\"!clusterTemplate\" class=\"node cluster\">\n            <svg:rect\n              [attr.width]=\"node.dimension.width\"\n              [attr.height]=\"node.dimension.height\"\n              [attr.fill]=\"node.data?.color\"\n            />\n            <svg:text alignment-baseline=\"central\" [attr.x]=\"10\" [attr.y]=\"node.dimension.height / 2\">\n              {{ node.label }}\n            </svg:text>\n          </svg:g>\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"links\">\n        <svg:g #linkElement *ngFor=\"let link of graph.edges; trackBy: trackLinkBy\" class=\"link-group\" [id]=\"link.id\">\n          <ng-container\n            *ngIf=\"linkTemplate\"\n            [ngTemplateOutlet]=\"linkTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: link }\"\n          ></ng-container>\n          <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"nodes\">\n        <svg:g\n          #nodeElement\n          *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldNodes.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n          (mousedown)=\"onNodeMouseDown($event, node)\"\n        >\n          <ng-container\n            *ngIf=\"nodeTemplate\"\n            [ngTemplateOutlet]=\"nodeTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:circle\n            *ngIf=\"!nodeTemplate\"\n            r=\"10\"\n            [attr.cx]=\"node.dimension.width / 2\"\n            [attr.cy]=\"node.dimension.height / 2\"\n            [attr.fill]=\"node.data?.color\"\n          />\n        </svg:g>\n      </svg:g>\n    </svg:g>\n\n    <svg:clipPath [attr.id]=\"minimapClipPathId\">\n      <svg:rect\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n      ></svg:rect>\n    </svg:clipPath>\n\n    <svg:g\n      class=\"minimap\"\n      *ngIf=\"showMiniMap\"\n      [attr.transform]=\"minimapTransform\"\n      [attr.clip-path]=\"'url(#' + minimapClipPathId + ')'\"\n    >\n      <svg:rect\n        class=\"minimap-background\"\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n        (mousedown)=\"onMinimapPanTo($event)\"\n      ></svg:rect>\n\n      <svg:g\n        [style.transform]=\"\n          'translate(' +\n          -minimapOffsetX / minimapScaleCoefficient +\n          'px,' +\n          -minimapOffsetY / minimapScaleCoefficient +\n          'px)'\n        \"\n      >\n        <svg:g class=\"minimap-nodes\" [style.transform]=\"'scale(' + 1 / minimapScaleCoefficient + ')'\">\n          <svg:g\n            #nodeElement\n            *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n            class=\"node-group\"\n            [class.old-node]=\"animate && oldNodes.has(node.id)\"\n            [id]=\"node.id\"\n            [attr.transform]=\"node.transform\"\n          >\n            <ng-container\n              *ngIf=\"miniMapNodeTemplate\"\n              [ngTemplateOutlet]=\"miniMapNodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <ng-container\n              *ngIf=\"!miniMapNodeTemplate && nodeTemplate\"\n              [ngTemplateOutlet]=\"nodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <svg:circle\n              *ngIf=\"!nodeTemplate && !miniMapNodeTemplate\"\n              r=\"10\"\n              [attr.cx]=\"node.dimension.width / 2 / minimapScaleCoefficient\"\n              [attr.cy]=\"node.dimension.height / 2 / minimapScaleCoefficient\"\n              [attr.fill]=\"node.data?.color\"\n            />\n          </svg:g>\n        </svg:g>\n\n        <svg:rect\n          [attr.transform]=\"\n            'translate(' +\n            panOffsetX / zoomLevel / -minimapScaleCoefficient +\n            ',' +\n            panOffsetY / zoomLevel / -minimapScaleCoefficient +\n            ')'\n          \"\n          class=\"minimap-drag\"\n          [class.panning]=\"isMinimapPanning\"\n          [attr.width]=\"width / minimapScaleCoefficient / zoomLevel\"\n          [attr.height]=\"height / minimapScaleCoefficient / zoomLevel\"\n          (mousedown)=\"onMinimapDragMouseDown()\"\n        ></svg:rect>\n      </svg:g>\n    </svg:g>\n  </svg:svg>\n</div>\n", styles: [".minimap .minimap-background{fill:#0000001a}.minimap .minimap-drag{fill:#0003;stroke:#fff;stroke-width:1px;stroke-dasharray:2px;stroke-dashoffset:2px;cursor:pointer}.minimap .minimap-drag.panning{fill:#0000004d}.minimap .minimap-nodes{opacity:.5;pointer-events:none}.graph{-webkit-user-select:none;user-select:none}.graph .edge{stroke:#666;fill:none}.graph .edge .edge-label{stroke:none;font-size:12px;fill:#251e1e}.graph .panning-rect{fill:#0000;cursor:move}.graph .node-group.old-node{transition:transform .5s ease-in-out}.graph .node-group .node:focus{outline:none}.graph .cluster rect{opacity:.2}\n"] }]
        }], ctorParameters: function () { return [{ type: i0.ElementRef }, { type: i0.NgZone }, { type: i0.ChangeDetectorRef }, { type: i1.LayoutService }]; }, propDecorators: { nodes: [{
                type: Input
            }], clusters: [{
                type: Input
            }], links: [{
                type: Input
            }], activeEntries: [{
                type: Input
            }], curve: [{
                type: Input
            }], draggingEnabled: [{
                type: Input
            }], nodeHeight: [{
                type: Input
            }], nodeMaxHeight: [{
                type: Input
            }], nodeMinHeight: [{
                type: Input
            }], nodeWidth: [{
                type: Input
            }], nodeMinWidth: [{
                type: Input
            }], nodeMaxWidth: [{
                type: Input
            }], panningEnabled: [{
                type: Input
            }], panningAxis: [{
                type: Input
            }], enableZoom: [{
                type: Input
            }], zoomSpeed: [{
                type: Input
            }], minZoomLevel: [{
                type: Input
            }], maxZoomLevel: [{
                type: Input
            }], autoZoom: [{
                type: Input
            }], panOnZoom: [{
                type: Input
            }], animate: [{
                type: Input
            }], autoCenter: [{
                type: Input
            }], zoomToFitMargin: [{
                type: Input
            }], update$: [{
                type: Input
            }], center$: [{
                type: Input
            }], zoomToFit$: [{
                type: Input
            }], panToNode$: [{
                type: Input
            }], layout: [{
                type: Input
            }], layoutSettings: [{
                type: Input
            }], enableTrackpadSupport: [{
                type: Input
            }], showMiniMap: [{
                type: Input
            }], miniMapMaxWidth: [{
                type: Input
            }], miniMapMaxHeight: [{
                type: Input
            }], miniMapPosition: [{
                type: Input
            }], view: [{
                type: Input
            }], scheme: [{
                type: Input
            }], customColors: [{
                type: Input
            }], animations: [{
                type: Input
            }], select: [{
                type: Output
            }], activate: [{
                type: Output
            }], deactivate: [{
                type: Output
            }], zoomChange: [{
                type: Output
            }], clickHandler: [{
                type: Output
            }], linkTemplate: [{
                type: ContentChild,
                args: ['linkTemplate']
            }], nodeTemplate: [{
                type: ContentChild,
                args: ['nodeTemplate']
            }], clusterTemplate: [{
                type: ContentChild,
                args: ['clusterTemplate']
            }], defsTemplate: [{
                type: ContentChild,
                args: ['defsTemplate']
            }], miniMapNodeTemplate: [{
                type: ContentChild,
                args: ['miniMapNodeTemplate']
            }], nodeElements: [{
                type: ViewChildren,
                args: ['nodeElement']
            }], linkElements: [{
                type: ViewChildren,
                args: ['linkElement']
            }], groupResultsBy: [{
                type: Input
            }], zoomLevel: [{
                type: Input,
                args: ['zoomLevel']
            }], panOffsetX: [{
                type: Input,
                args: ['panOffsetX']
            }], panOffsetY: [{
                type: Input,
                args: ['panOffsetY']
            }], updateMinimap: [], onMouseMove: [{
                type: HostListener,
                args: ['document:mousemove', ['$event']]
            }], onMouseDown: [{
                type: HostListener,
                args: ['document:mousedown', ['$event']]
            }], graphClick: [{
                type: HostListener,
                args: ['document:click', ['$event']]
            }], onTouchMove: [{
                type: HostListener,
                args: ['document:touchmove', ['$event']]
            }], onMouseUp: [{
                type: HostListener,
                args: ['document:mouseup', ['$event']]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3dpbWxhbmUvbmd4LWdyYXBoL3NyYy9saWIvZ3JhcGgvZ3JhcGguY29tcG9uZW50LnRzIiwiLi4vLi4vLi4vLi4vLi4vc3dpbWxhbmUvbmd4LWdyYXBoL3NyYy9saWIvZ3JhcGgvZ3JhcGguY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHVEQUF1RDtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLElBQUksWUFBWSxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFGLE9BQU8sRUFFTCx1QkFBdUIsRUFDdkIsU0FBUyxFQUNULFlBQVksRUFFWixZQUFZLEVBQ1osWUFBWSxFQUNaLEtBQUssRUFHTCxNQUFNLEVBR04sWUFBWSxFQUNaLGlCQUFpQixFQUtsQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sS0FBSyxLQUFLLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sS0FBSyxJQUFJLE1BQU0sU0FBUyxDQUFDO0FBQ2hDLE9BQU8sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxTQUFTLElBQUksbUJBQW1CLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQU1uRyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FB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WTt1QkFBQyxjQUFjO2dCQUNLLGVBQWU7c0JBQS9DLFlBQVk7dUJBQUMsaUJBQWlCO2dCQUNELFlBQVk7c0JBQXpDLFlBQVk7dUJBQUMsY0FBYztnQkFDUyxtQkFBbUI7c0JBQXZELFlBQVk7dUJBQUMscUJBQXFCO2dCQUVOLFlBQVk7c0JBQXhDLFlBQVk7dUJBQUMsYUFBYTtnQkFDRSxZQUFZO3NCQUF4QyxZQUFZO3VCQUFDLGFBQWE7Z0JBMkMzQixjQUFjO3NCQURiLEtBQUs7Z0JBY0YsU0FBUztzQkFEWixLQUFLO3VCQUFDLFdBQVc7Z0JBZ0JkLFVBQVU7c0JBRGIsS0FBSzt1QkFBQyxZQUFZO2dCQWdCZixVQUFVO3NCQURiLEtBQUs7dUJBQUMsWUFBWTtnQkE4WG5CLGFBQWEsTUFtYWIsV0FBVztzQkFEVixZQUFZO3VCQUFDLG9CQUFvQixFQUFFLENBQUMsUUFBUSxDQUFDO2dCQVc5QyxXQUFXO3NCQURWLFlBQVk7dUJBQUMsb0JBQW9CLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBTTlDLFVBQVU7c0JBRFQsWUFBWTt1QkFBQyxnQkFBZ0IsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFzQjFDLFdBQVc7c0JBRFYsWUFBWTt1QkFBQyxvQkFBb0IsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkE2QjlDLFNBQVM7c0JBRFIsWUFBWTt1QkFBQyxrQkFBa0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHJlbmFtZSB0cmFuc2l0aW9uIGR1ZSB0byBjb25mbGljdCB3aXRoIGQzIHRyYW5zaXRpb25cbmltcG9ydCB7IGFuaW1hdGUsIHN0eWxlLCB0cmFuc2l0aW9uIGFzIG5nVHJhbnNpdGlvbiwgdHJpZ2dlciB9IGZyb20gJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnO1xuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgQ29udGVudENoaWxkLFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIEhvc3RMaXN0ZW5lcixcbiAgSW5wdXQsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFF1ZXJ5TGlzdCxcbiAgVGVtcGxhdGVSZWYsXG4gIFZpZXdDaGlsZHJlbixcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIE5nWm9uZSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIE9uQ2hhbmdlcyxcbiAgU2ltcGxlQ2hhbmdlc1xufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IHNlbGVjdCB9IGZyb20gJ2QzLXNlbGVjdGlvbic7XG5pbXBvcnQgKiBhcyBzaGFwZSBmcm9tICdkMy1zaGFwZSc7XG5pbXBvcnQgKiBhcyBlYXNlIGZyb20gJ2QzLWVhc2UnO1xuaW1wb3J0ICdkMy10cmFuc2l0aW9uJztcbmltcG9ydCB7IE9ic2VydmFibGUsIFN1YnNjcmlwdGlvbiwgb2YsIGZyb21FdmVudCBhcyBvYnNlcnZhYmxlRnJvbUV2ZW50IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaXJzdCwgZGVib3VuY2VUaW1lIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgaWRlbnRpdHksIHNjYWxlLCBzbW9vdGhNYXRyaXgsIHRvU1ZHLCB0cmFuc2Zvcm0sIHRyYW5zbGF0ZSB9IGZyb20gJ3RyYW5zZm9ybWF0aW9uLW1hdHJpeCc7XG5pbXBvcnQgeyBMYXlvdXQgfSBmcm9tICcuLi9tb2RlbHMvbGF5b3V0Lm1vZGVsJztcbmltcG9ydCB7IExheW91dFNlcnZpY2UgfSBmcm9tICcuL2xheW91dHMvbGF5b3V0LnNlcnZpY2UnO1xuaW1wb3J0IHsgRWRnZSB9IGZyb20gJy4uL21vZGVscy9lZGdlLm1vZGVsJztcbmltcG9ydCB7IE5vZGUsIENsdXN0ZXJOb2RlIH0gZnJvbSAnLi4vbW9kZWxzL25vZGUubW9kZWwnO1xuaW1wb3J0IHsgR3JhcGggfSBmcm9tICcuLi9tb2RlbHMvZ3JhcGgubW9kZWwnO1xuaW1wb3J0IHsgaWQgfSBmcm9tICcuLi91dGlscy9pZCc7XG5pbXBvcnQgeyBQYW5uaW5nQXhpcyB9IGZyb20gJy4uL2VudW1zL3Bhbm5pbmcuZW51bSc7XG5pbXBvcnQgeyBNaW5pTWFwUG9zaXRpb24gfSBmcm9tICcuLi9lbnVtcy9taW5pLW1hcC1wb3NpdGlvbi5lbnVtJztcbmltcG9ydCB7IHRocm90dGxlYWJsZSB9IGZyb20gJy4uL3V0aWxzL3Rocm90dGxlJztcbmltcG9ydCB7IENvbG9ySGVscGVyIH0gZnJvbSAnLi4vdXRpbHMvY29sb3IuaGVscGVyJztcbmltcG9ydCB7IFZpZXdEaW1lbnNpb25zLCBjYWxjdWxhdGVWaWV3RGltZW5zaW9ucyB9IGZyb20gJy4uL3V0aWxzL3ZpZXctZGltZW5zaW9ucy5oZWxwZXInO1xuaW1wb3J0IHsgVmlzaWJpbGl0eU9ic2VydmVyIH0gZnJvbSAnLi4vdXRpbHMvdmlzaWJpbGl0eS1vYnNlcnZlcic7XG5cbi8qKlxuICogTWF0cml4XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0cml4IHtcbiAgYTogbnVtYmVyO1xuICBiOiBudW1iZXI7XG4gIGM6IG51bWJlcjtcbiAgZDogbnVtYmVyO1xuICBlOiBudW1iZXI7XG4gIGY6IG51bWJlcjtcbn1cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbmd4LWdyYXBoJyxcbiAgc3R5bGVVcmxzOiBbJy4vZ3JhcGguY29tcG9uZW50LnNjc3MnXSxcbiAgdGVtcGxhdGVVcmw6ICdncmFwaC5jb21wb25lbnQuaHRtbCcsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBhbmltYXRpb25zOiBbXG4gICAgdHJpZ2dlcignYW5pbWF0aW9uU3RhdGUnLCBbXG4gICAgICBuZ1RyYW5zaXRpb24oJzplbnRlcicsIFtzdHlsZSh7IG9wYWNpdHk6IDAgfSksIGFuaW1hdGUoJzUwMG1zIDEwMG1zJywgc3R5bGUoeyBvcGFjaXR5OiAxIH0pKV0pXG4gICAgXSlcbiAgXVxufSlcbmV4cG9ydCBjbGFzcyBHcmFwaENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIEFmdGVyVmlld0luaXQge1xuICBASW5wdXQoKSBub2RlczogTm9kZVtdID0gW107XG4gIEBJbnB1dCgpIGNsdXN0ZXJzOiBDbHVzdGVyTm9kZVtdID0gW107XG4gIEBJbnB1dCgpIGxpbmtzOiBFZGdlW10gPSBbXTtcbiAgQElucHV0KCkgYWN0aXZlRW50cmllczogYW55W10gPSBbXTtcbiAgQElucHV0KCkgY3VydmU6IGFueTtcbiAgQElucHV0KCkgZHJhZ2dpbmdFbmFibGVkID0gdHJ1ZTtcbiAgQElucHV0KCkgbm9kZUhlaWdodDogbnVtYmVyO1xuICBASW5wdXQoKSBub2RlTWF4SGVpZ2h0OiBudW1iZXI7XG4gIEBJbnB1dCgpIG5vZGVNaW5IZWlnaHQ6IG51bWJlcjtcbiAgQElucHV0KCkgbm9kZVdpZHRoOiBudW1iZXI7XG4gIEBJbnB1dCgpIG5vZGVNaW5XaWR0aDogbnVtYmVyO1xuICBASW5wdXQoKSBub2RlTWF4V2lkdGg6IG51bWJlcjtcbiAgQElucHV0KCkgcGFubmluZ0VuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuICBASW5wdXQoKSBwYW5uaW5nQXhpczogUGFubmluZ0F4aXMgPSBQYW5uaW5nQXhpcy5Cb3RoO1xuICBASW5wdXQoKSBlbmFibGVab29tID0gdHJ1ZTtcbiAgQElucHV0KCkgem9vbVNwZWVkID0gMC4xO1xuICBASW5wdXQoKSBtaW5ab29tTGV2ZWwgPSAwLjE7XG4gIEBJbnB1dCgpIG1heFpvb21MZXZlbCA9IDQuMDtcbiAgQElucHV0KCkgYXV0b1pvb20gPSBmYWxzZTtcbiAgQElucHV0KCkgcGFuT25ab29tID0gdHJ1ZTtcbiAgQElucHV0KCkgYW5pbWF0ZT8gPSBmYWxzZTtcbiAgQElucHV0KCkgYXV0b0NlbnRlciA9IGZhbHNlO1xuICAvKiogTWFyZ2luIGFwcGxpZWQgYXJvdW5kIHRoZSBkcmF3aW5nIGFyZWEgb24gem9vbSB0byBmaXQgKi9cbiAgQElucHV0KCkgem9vbVRvRml0TWFyZ2luOiB7eDogbnVtYmVyLCB5OiBudW1iZXJ9O1xuICBASW5wdXQoKSB1cGRhdGUkOiBPYnNlcnZhYmxlPGFueT47XG4gIEBJbnB1dCgpIGNlbnRlciQ6IE9ic2VydmFibGU8YW55PjtcbiAgQElucHV0KCkgem9vbVRvRml0JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBASW5wdXQoKSBwYW5Ub05vZGUkOiBPYnNlcnZhYmxlPGFueT47XG4gIEBJbnB1dCgpIGxheW91dDogc3RyaW5nIHwgTGF5b3V0O1xuICBASW5wdXQoKSBsYXlvdXRTZXR0aW5nczogYW55O1xuICBASW5wdXQoKSBlbmFibGVUcmFja3BhZFN1cHBvcnQgPSBmYWxzZTtcbiAgQElucHV0KCkgc2hvd01pbmlNYXA6IGJvb2xlYW4gPSBmYWxzZTtcbiAgQElucHV0KCkgbWluaU1hcE1heFdpZHRoOiBudW1iZXIgPSAxMDA7XG4gIEBJbnB1dCgpIG1pbmlNYXBNYXhIZWlnaHQ6IG51bWJlcjtcbiAgQElucHV0KCkgbWluaU1hcFBvc2l0aW9uOiBNaW5pTWFwUG9zaXRpb24gPSBNaW5pTWFwUG9zaXRpb24uVXBwZXJSaWdodDtcbiAgQElucHV0KCkgdmlldzogW251bWJlciwgbnVtYmVyXTtcbiAgQElucHV0KCkgc2NoZW1lOiBhbnkgPSAnY29vbCc7XG4gIEBJbnB1dCgpIGN1c3RvbUNvbG9yczogYW55O1xuICBASW5wdXQoKSBhbmltYXRpb25zOiBib29sZWFuID0gdHJ1ZTtcbiAgQE91dHB1dCgpIHNlbGVjdCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBAT3V0cHV0KCkgYWN0aXZhdGU6IEV2ZW50RW1pdHRlcjxhbnk+ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZGVhY3RpdmF0ZTogRXZlbnRFbWl0dGVyPGFueT4gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSB6b29tQ2hhbmdlOiBFdmVudEVtaXR0ZXI8bnVtYmVyPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGNsaWNrSGFuZGxlcjogRXZlbnRFbWl0dGVyPE1vdXNlRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIEBDb250ZW50Q2hpbGQoJ2xpbmtUZW1wbGF0ZScpIGxpbmtUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZCgnbm9kZVRlbXBsYXRlJykgbm9kZVRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICBAQ29udGVudENoaWxkKCdjbHVzdGVyVGVtcGxhdGUnKSBjbHVzdGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoJ2RlZnNUZW1wbGF0ZScpIGRlZnNUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZCgnbWluaU1hcE5vZGVUZW1wbGF0ZScpIG1pbmlNYXBOb2RlVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG5cbiAgQFZpZXdDaGlsZHJlbignbm9kZUVsZW1lbnQnKSBub2RlRWxlbWVudHM6IFF1ZXJ5TGlzdDxFbGVtZW50UmVmPjtcbiAgQFZpZXdDaGlsZHJlbignbGlua0VsZW1lbnQnKSBsaW5rRWxlbWVudHM6IFF1ZXJ5TGlzdDxFbGVtZW50UmVmPjtcblxuICBwdWJsaWMgY2hhcnRXaWR0aDogYW55O1xuXG4gIHByaXZhdGUgaXNNb3VzZU1vdmVDYWxsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBncmFwaFN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uID0gbmV3IFN1YnNjcmlwdGlvbigpO1xuICBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuICBjb2xvcnM6IENvbG9ySGVscGVyO1xuICBkaW1zOiBWaWV3RGltZW5zaW9ucztcbiAgc2VyaWVzRG9tYWluOiBhbnk7XG4gIHRyYW5zZm9ybTogc3RyaW5nO1xuICBpc1Bhbm5pbmcgPSBmYWxzZTtcbiAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICBkcmFnZ2luZ05vZGU6IE5vZGU7XG4gIGluaXRpYWxpemVkID0gZmFsc2U7XG4gIGdyYXBoOiBHcmFwaDtcbiAgZ3JhcGhEaW1zOiBhbnkgPSB7IHdpZHRoOiAwLCBoZWlnaHQ6IDAgfTtcbiAgX29sZExpbmtzOiBFZGdlW10gPSBbXTtcbiAgb2xkTm9kZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBvbGRDbHVzdGVyczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG4gIHRyYW5zZm9ybWF0aW9uTWF0cml4OiBNYXRyaXggPSBpZGVudGl0eSgpO1xuICBfdG91Y2hMYXN0WCA9IG51bGw7XG4gIF90b3VjaExhc3RZID0gbnVsbDtcbiAgbWluaW1hcFNjYWxlQ29lZmZpY2llbnQ6IG51bWJlciA9IDM7XG4gIG1pbmltYXBUcmFuc2Zvcm06IHN0cmluZztcbiAgbWluaW1hcE9mZnNldFg6IG51bWJlciA9IDA7XG4gIG1pbmltYXBPZmZzZXRZOiBudW1iZXIgPSAwO1xuICBpc01pbmltYXBQYW5uaW5nID0gZmFsc2U7XG4gIG1pbmltYXBDbGlwUGF0aElkOiBzdHJpbmc7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICByZXNpemVTdWJzY3JpcHRpb246IGFueTtcbiAgdmlzaWJpbGl0eU9ic2VydmVyOiBWaXNpYmlsaXR5T2JzZXJ2ZXI7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBlbDogRWxlbWVudFJlZixcbiAgICBwdWJsaWMgem9uZTogTmdab25lLFxuICAgIHB1YmxpYyBjZDogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgcHJpdmF0ZSBsYXlvdXRTZXJ2aWNlOiBMYXlvdXRTZXJ2aWNlXG4gICkge31cblxuICBASW5wdXQoKVxuICBncm91cFJlc3VsdHNCeTogKG5vZGU6IGFueSkgPT4gc3RyaW5nID0gbm9kZSA9PiBub2RlLmxhYmVsO1xuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgem9vbSBsZXZlbFxuICAgKi9cbiAgZ2V0IHpvb21MZXZlbCgpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5hO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgY3VycmVudCB6b29tIGxldmVsXG4gICAqL1xuICBASW5wdXQoJ3pvb21MZXZlbCcpXG4gIHNldCB6b29tTGV2ZWwobGV2ZWwpIHtcbiAgICB0aGlzLnpvb21UbyhOdW1iZXIobGV2ZWwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgYHhgIHBvc2l0aW9uIG9mIHRoZSBncmFwaFxuICAgKi9cbiAgZ2V0IHBhbk9mZnNldFgoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXguZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGN1cnJlbnQgYHhgIHBvc2l0aW9uIG9mIHRoZSBncmFwaFxuICAgKi9cbiAgQElucHV0KCdwYW5PZmZzZXRYJylcbiAgc2V0IHBhbk9mZnNldFgoeCkge1xuICAgIHRoaXMucGFuVG8oTnVtYmVyKHgpLCBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgYHlgIHBvc2l0aW9uIG9mIHRoZSBncmFwaFxuICAgKi9cbiAgZ2V0IHBhbk9mZnNldFkoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXguZjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGN1cnJlbnQgYHlgIHBvc2l0aW9uIG9mIHRoZSBncmFwaFxuICAgKi9cbiAgQElucHV0KCdwYW5PZmZzZXRZJylcbiAgc2V0IHBhbk9mZnNldFkoeSkge1xuICAgIHRoaXMucGFuVG8obnVsbCwgTnVtYmVyKHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbmd1bGFyIGxpZmVjeWNsZSBldmVudFxuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnVwZGF0ZSQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICB0aGlzLnVwZGF0ZSQuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jZW50ZXIkKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgdGhpcy5jZW50ZXIkLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jZW50ZXIoKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh0aGlzLnpvb21Ub0ZpdCQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICB0aGlzLnpvb21Ub0ZpdCQuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnpvb21Ub0ZpdCgpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wYW5Ub05vZGUkKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgdGhpcy5wYW5Ub05vZGUkLnN1YnNjcmliZSgobm9kZUlkOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICB0aGlzLnBhblRvTm9kZUlkKG5vZGVJZCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMubWluaW1hcENsaXBQYXRoSWQgPSBgbWluaW1hcENsaXAke2lkKCl9YDtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICB0aGlzLmJhc2ljVXBkYXRlKCk7XG5cbiAgICBjb25zdCB7IGxheW91dCwgbGF5b3V0U2V0dGluZ3MsIG5vZGVzLCBjbHVzdGVycywgbGlua3MgfSA9IGNoYW5nZXM7XG4gICAgdGhpcy5zZXRMYXlvdXQodGhpcy5sYXlvdXQpO1xuICAgIGlmIChsYXlvdXRTZXR0aW5ncykge1xuICAgICAgdGhpcy5zZXRMYXlvdXRTZXR0aW5ncyh0aGlzLmxheW91dFNldHRpbmdzKTtcbiAgICB9XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuXG4gIHNldExheW91dChsYXlvdXQ6IHN0cmluZyB8IExheW91dCk6IHZvaWQge1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICBpZiAoIWxheW91dCkge1xuICAgICAgbGF5b3V0ID0gJ2RhZ3JlJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBsYXlvdXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmxheW91dCA9IHRoaXMubGF5b3V0U2VydmljZS5nZXRMYXlvdXQobGF5b3V0KTtcbiAgICAgIHRoaXMuc2V0TGF5b3V0U2V0dGluZ3ModGhpcy5sYXlvdXRTZXR0aW5ncyk7XG4gICAgfVxuICB9XG5cbiAgc2V0TGF5b3V0U2V0dGluZ3Moc2V0dGluZ3M6IGFueSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxheW91dCAmJiB0eXBlb2YgdGhpcy5sYXlvdXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmxheW91dC5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmd1bGFyIGxpZmVjeWNsZSBldmVudFxuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMudW5iaW5kRXZlbnRzKCk7XG4gICAgaWYgKHRoaXMudmlzaWJpbGl0eU9ic2VydmVyKSB7XG4gICAgICB0aGlzLnZpc2liaWxpdHlPYnNlcnZlci52aXNpYmxlLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLnZpc2liaWxpdHlPYnNlcnZlci5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zdWJzY3JpcHRpb25zKSB7XG4gICAgICBzdWIudW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbmd1bGFyIGxpZmVjeWNsZSBldmVudFxuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLmJpbmRXaW5kb3dSZXNpemVFdmVudCgpO1xuXG4gICAgLy8gbGlzdGVuIGZvciB2aXNpYmlsaXR5IG9mIHRoZSBlbGVtZW50IGZvciBoaWRkZW4gYnkgZGVmYXVsdCBzY2VuYXJpb1xuICAgIHRoaXMudmlzaWJpbGl0eU9ic2VydmVyID0gbmV3IFZpc2liaWxpdHlPYnNlcnZlcih0aGlzLmVsLCB0aGlzLnpvbmUpO1xuICAgIHRoaXMudmlzaWJpbGl0eU9ic2VydmVyLnZpc2libGUuc3Vic2NyaWJlKHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnVwZGF0ZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCYXNlIGNsYXNzIHVwZGF0ZSBpbXBsZW1lbnRhdGlvbiBmb3IgdGhlIGRhZyBncmFwaFxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICB0aGlzLmJhc2ljVXBkYXRlKCk7XG4gICAgaWYgKCF0aGlzLmN1cnZlKSB7XG4gICAgICB0aGlzLmN1cnZlID0gc2hhcGUuY3VydmVCdW5kbGUuYmV0YSgxKTtcbiAgICB9XG5cbiAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcbiAgICAgIHRoaXMuZGltcyA9IGNhbGN1bGF0ZVZpZXdEaW1lbnNpb25zKHtcbiAgICAgICAgd2lkdGg6IHRoaXMud2lkdGgsXG4gICAgICAgIGhlaWdodDogdGhpcy5oZWlnaHRcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNlcmllc0RvbWFpbiA9IHRoaXMuZ2V0U2VyaWVzRG9tYWluKCk7XG4gICAgICB0aGlzLnNldENvbG9ycygpO1xuXG4gICAgICB0aGlzLmNyZWF0ZUdyYXBoKCk7XG4gICAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpO1xuICAgICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgZGFncmUgZ3JhcGggZW5naW5lXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgY3JlYXRlR3JhcGgoKTogdm9pZCB7XG4gICAgdGhpcy5ncmFwaFN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMuZ3JhcGhTdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKCk7XG4gICAgY29uc3QgaW5pdGlhbGl6ZU5vZGUgPSAobjogTm9kZSkgPT4ge1xuICAgICAgaWYgKCFuLm1ldGEpIHtcbiAgICAgICAgbi5tZXRhID0ge307XG4gICAgICB9XG4gICAgICBpZiAoIW4uaWQpIHtcbiAgICAgICAgbi5pZCA9IGlkKCk7XG4gICAgICB9XG4gICAgICBpZiAoIW4uZGltZW5zaW9uKSB7XG4gICAgICAgIG4uZGltZW5zaW9uID0ge1xuICAgICAgICAgIHdpZHRoOiB0aGlzLm5vZGVXaWR0aCA/IHRoaXMubm9kZVdpZHRoIDogMzAsXG4gICAgICAgICAgaGVpZ2h0OiB0aGlzLm5vZGVIZWlnaHQgPyB0aGlzLm5vZGVIZWlnaHQgOiAzMFxuICAgICAgICB9O1xuICAgICAgICBuLm1ldGEuZm9yY2VEaW1lbnNpb25zID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuLm1ldGEuZm9yY2VEaW1lbnNpb25zID0gbi5tZXRhLmZvcmNlRGltZW5zaW9ucyA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG4ubWV0YS5mb3JjZURpbWVuc2lvbnM7XG4gICAgICB9XG4gICAgICBpZiAoIW4ucG9zaXRpb24pIHtcbiAgICAgICAgbi5wb3NpdGlvbiA9IHtcbiAgICAgICAgICB4OiAwLFxuICAgICAgICAgIHk6IDBcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgbi5kYXRhID0gbi5kYXRhID8gbi5kYXRhIDoge307XG4gICAgICByZXR1cm4gbjtcbiAgICB9O1xuXG4gICAgdGhpcy5ncmFwaCA9IHtcbiAgICAgIG5vZGVzOiB0aGlzLm5vZGVzLmxlbmd0aCA+IDAgPyBbLi4udGhpcy5ub2Rlc10ubWFwKGluaXRpYWxpemVOb2RlKSA6IFtdLFxuICAgICAgY2x1c3RlcnM6IHRoaXMuY2x1c3RlcnMgJiYgdGhpcy5jbHVzdGVycy5sZW5ndGggPiAwID8gWy4uLnRoaXMuY2x1c3RlcnNdLm1hcChpbml0aWFsaXplTm9kZSkgOiBbXSxcbiAgICAgIGVkZ2VzOlxuICAgICAgICB0aGlzLmxpbmtzLmxlbmd0aCA+IDBcbiAgICAgICAgICA/IFsuLi50aGlzLmxpbmtzXS5tYXAoZSA9PiB7XG4gICAgICAgICAgICAgIGlmICghZS5pZCkge1xuICAgICAgICAgICAgICAgIGUuaWQgPSBpZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICA6IFtdXG4gICAgfTtcblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB0aGlzLmRyYXcoKSk7XG4gIH1cblxuICAvKipcbiAgICogRHJhd3MgdGhlIGdyYXBoIHVzaW5nIGRhZ3JlIGxheW91dHNcbiAgICpcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBkcmF3KCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sYXlvdXQgfHwgdHlwZW9mIHRoaXMubGF5b3V0ID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBDYWxjIHZpZXcgZGltcyBmb3IgdGhlIG5vZGVzXG4gICAgdGhpcy5hcHBseU5vZGVEaW1lbnNpb25zKCk7XG5cbiAgICAvLyBSZWNhbGMgdGhlIGxheW91dFxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubGF5b3V0LnJ1bih0aGlzLmdyYXBoKTtcbiAgICBjb25zdCByZXN1bHQkID0gcmVzdWx0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZSA/IHJlc3VsdCA6IG9mKHJlc3VsdCk7XG4gICAgdGhpcy5ncmFwaFN1YnNjcmlwdGlvbi5hZGQoXG4gICAgICByZXN1bHQkLnN1YnNjcmliZShncmFwaCA9PiB7XG4gICAgICAgIHRoaXMuZ3JhcGggPSBncmFwaDtcbiAgICAgICAgdGhpcy50aWNrKCk7XG4gICAgICB9KVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5ncmFwaC5ub2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXN1bHQkLnBpcGUoZmlyc3QoKSkuc3Vic2NyaWJlKCgpID0+IHRoaXMuYXBwbHlOb2RlRGltZW5zaW9ucygpKTtcbiAgfVxuXG4gIHRpY2soKSB7XG4gICAgLy8gVHJhbnNwb3NlcyB2aWV3IG9wdGlvbnMgdG8gdGhlIG5vZGVcbiAgICBjb25zdCBvbGROb2RlczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG5cbiAgICB0aGlzLmdyYXBoLm5vZGVzLm1hcChuID0+IHtcbiAgICAgIG4udHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke24ucG9zaXRpb24ueCAtIG4uZGltZW5zaW9uLndpZHRoIC8gMiB8fCAwfSwgJHtcbiAgICAgICAgbi5wb3NpdGlvbi55IC0gbi5kaW1lbnNpb24uaGVpZ2h0IC8gMiB8fCAwXG4gICAgICB9KWA7XG4gICAgICBpZiAoIW4uZGF0YSkge1xuICAgICAgICBuLmRhdGEgPSB7fTtcbiAgICAgIH1cbiAgICAgIG4uZGF0YS5jb2xvciA9IHRoaXMuY29sb3JzLmdldENvbG9yKHRoaXMuZ3JvdXBSZXN1bHRzQnkobikpO1xuICAgICAgb2xkTm9kZXMuYWRkKG4uaWQpO1xuICAgIH0pO1xuXG4gICAgY29uc3Qgb2xkQ2x1c3RlcnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuXG4gICAgKHRoaXMuZ3JhcGguY2x1c3RlcnMgfHwgW10pLm1hcChuID0+IHtcbiAgICAgIG4udHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke24ucG9zaXRpb24ueCAtIG4uZGltZW5zaW9uLndpZHRoIC8gMiB8fCAwfSwgJHtcbiAgICAgICAgbi5wb3NpdGlvbi55IC0gbi5kaW1lbnNpb24uaGVpZ2h0IC8gMiB8fCAwXG4gICAgICB9KWA7XG4gICAgICBpZiAoIW4uZGF0YSkge1xuICAgICAgICBuLmRhdGEgPSB7fTtcbiAgICAgIH1cbiAgICAgIG4uZGF0YS5jb2xvciA9IHRoaXMuY29sb3JzLmdldENvbG9yKHRoaXMuZ3JvdXBSZXN1bHRzQnkobikpO1xuICAgICAgb2xkQ2x1c3RlcnMuYWRkKG4uaWQpO1xuICAgIH0pO1xuXG4gICAgLy8gUHJldmVudCBhbmltYXRpb25zIG9uIG5ldyBub2Rlc1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5vbGROb2RlcyA9IG9sZE5vZGVzO1xuICAgICAgdGhpcy5vbGRDbHVzdGVycyA9IG9sZENsdXN0ZXJzO1xuICAgIH0sIDUwMCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIGxhYmVscyB0byB0aGUgbmV3IHBvc2l0aW9uc1xuICAgIGNvbnN0IG5ld0xpbmtzID0gW107XG4gICAgZm9yIChjb25zdCBlZGdlTGFiZWxJZCBpbiB0aGlzLmdyYXBoLmVkZ2VMYWJlbHMpIHtcbiAgICAgIGNvbnN0IGVkZ2VMYWJlbCA9IHRoaXMuZ3JhcGguZWRnZUxhYmVsc1tlZGdlTGFiZWxJZF07XG5cbiAgICAgIGNvbnN0IG5vcm1LZXkgPSBlZGdlTGFiZWxJZC5yZXBsYWNlKC9bXlxcdy1dKi9nLCAnJyk7XG5cbiAgICAgIGNvbnN0IGlzTXVsdGlncmFwaCA9XG4gICAgICAgIHRoaXMubGF5b3V0ICYmIHR5cGVvZiB0aGlzLmxheW91dCAhPT0gJ3N0cmluZycgJiYgdGhpcy5sYXlvdXQuc2V0dGluZ3MgJiYgdGhpcy5sYXlvdXQuc2V0dGluZ3MubXVsdGlncmFwaDtcblxuICAgICAgbGV0IG9sZExpbmsgPSBpc011bHRpZ3JhcGhcbiAgICAgICAgPyB0aGlzLl9vbGRMaW5rcy5maW5kKG9sID0+IGAke29sLnNvdXJjZX0ke29sLnRhcmdldH0ke29sLmlkfWAgPT09IG5vcm1LZXkpXG4gICAgICAgIDogdGhpcy5fb2xkTGlua3MuZmluZChvbCA9PiBgJHtvbC5zb3VyY2V9JHtvbC50YXJnZXR9YCA9PT0gbm9ybUtleSk7XG5cbiAgICAgIGNvbnN0IGxpbmtGcm9tR3JhcGggPSBpc011bHRpZ3JhcGhcbiAgICAgICAgPyB0aGlzLmdyYXBoLmVkZ2VzLmZpbmQobmwgPT4gYCR7bmwuc291cmNlfSR7bmwudGFyZ2V0fSR7bmwuaWR9YCA9PT0gbm9ybUtleSlcbiAgICAgICAgOiB0aGlzLmdyYXBoLmVkZ2VzLmZpbmQobmwgPT4gYCR7bmwuc291cmNlfSR7bmwudGFyZ2V0fWAgPT09IG5vcm1LZXkpO1xuXG4gICAgICBpZiAoIW9sZExpbmspIHtcbiAgICAgICAgb2xkTGluayA9IGxpbmtGcm9tR3JhcGggfHwgZWRnZUxhYmVsO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgb2xkTGluay5kYXRhICYmXG4gICAgICAgIGxpbmtGcm9tR3JhcGggJiZcbiAgICAgICAgbGlua0Zyb21HcmFwaC5kYXRhICYmXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KG9sZExpbmsuZGF0YSkgIT09IEpTT04uc3RyaW5naWZ5KGxpbmtGcm9tR3JhcGguZGF0YSlcbiAgICAgICkge1xuICAgICAgICAvLyBDb21wYXJlIG9sZCBsaW5rIHRvIG5ldyBsaW5rIGFuZCByZXBsYWNlIGlmIG5vdCBlcXVhbFxuICAgICAgICBvbGRMaW5rLmRhdGEgPSBsaW5rRnJvbUdyYXBoLmRhdGE7XG4gICAgICB9XG5cbiAgICAgIG9sZExpbmsub2xkTGluZSA9IG9sZExpbmsubGluZTtcblxuICAgICAgY29uc3QgcG9pbnRzID0gZWRnZUxhYmVsLnBvaW50cztcbiAgICAgIGNvbnN0IGxpbmUgPSB0aGlzLmdlbmVyYXRlTGluZShwb2ludHMpO1xuXG4gICAgICBjb25zdCBuZXdMaW5rID0gT2JqZWN0LmFzc2lnbih7fSwgb2xkTGluayk7XG4gICAgICBuZXdMaW5rLmxpbmUgPSBsaW5lO1xuICAgICAgbmV3TGluay5wb2ludHMgPSBwb2ludHM7XG5cbiAgICAgIHRoaXMudXBkYXRlTWlkcG9pbnRPbkVkZ2UobmV3TGluaywgcG9pbnRzKTtcblxuICAgICAgY29uc3QgdGV4dFBvcyA9IHBvaW50c1tNYXRoLmZsb29yKHBvaW50cy5sZW5ndGggLyAyKV07XG4gICAgICBpZiAodGV4dFBvcykge1xuICAgICAgICBuZXdMaW5rLnRleHRUcmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7dGV4dFBvcy54IHx8IDB9LCR7dGV4dFBvcy55IHx8IDB9KWA7XG4gICAgICB9XG5cbiAgICAgIG5ld0xpbmsudGV4dEFuZ2xlID0gMDtcbiAgICAgIGlmICghbmV3TGluay5vbGRMaW5lKSB7XG4gICAgICAgIG5ld0xpbmsub2xkTGluZSA9IG5ld0xpbmsubGluZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jYWxjRG9taW5hbnRCYXNlbGluZShuZXdMaW5rKTtcbiAgICAgIG5ld0xpbmtzLnB1c2gobmV3TGluayk7XG4gICAgfVxuXG4gICAgdGhpcy5ncmFwaC5lZGdlcyA9IG5ld0xpbmtzO1xuXG4gICAgLy8gTWFwIHRoZSBvbGQgbGlua3MgZm9yIGFuaW1hdGlvbnNcbiAgICBpZiAodGhpcy5ncmFwaC5lZGdlcykge1xuICAgICAgdGhpcy5fb2xkTGlua3MgPSB0aGlzLmdyYXBoLmVkZ2VzLm1hcChsID0+IHtcbiAgICAgICAgY29uc3QgbmV3TCA9IE9iamVjdC5hc3NpZ24oe30sIGwpO1xuICAgICAgICBuZXdMLm9sZExpbmUgPSBsLmxpbmU7XG4gICAgICAgIHJldHVybiBuZXdMO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVNaW5pbWFwKCk7XG5cbiAgICBpZiAodGhpcy5hdXRvWm9vbSkge1xuICAgICAgdGhpcy56b29tVG9GaXQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hdXRvQ2VudGVyKSB7XG4gICAgICAvLyBBdXRvLWNlbnRlciB3aGVuIHJlbmRlcmluZ1xuICAgICAgdGhpcy5jZW50ZXIoKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5yZWRyYXdMaW5lcygpKTtcbiAgICB0aGlzLmNkLm1hcmtGb3JDaGVjaygpO1xuICB9XG5cbiAgZ2V0TWluaW1hcFRyYW5zZm9ybSgpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAodGhpcy5taW5pTWFwUG9zaXRpb24pIHtcbiAgICAgIGNhc2UgTWluaU1hcFBvc2l0aW9uLlVwcGVyTGVmdDoge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgICBjYXNlIE1pbmlNYXBQb3NpdGlvbi5VcHBlclJpZ2h0OiB7XG4gICAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyAodGhpcy5kaW1zLndpZHRoIC0gdGhpcy5ncmFwaERpbXMud2lkdGggLyB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50KSArICcsJyArIDAgKyAnKSc7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGVHcmFwaERpbXMoKSB7XG4gICAgbGV0IG1pblggPSArSW5maW5pdHk7XG4gICAgbGV0IG1heFggPSAtSW5maW5pdHk7XG4gICAgbGV0IG1pblkgPSArSW5maW5pdHk7XG4gICAgbGV0IG1heFkgPSAtSW5maW5pdHk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ3JhcGgubm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdyYXBoLm5vZGVzW2ldO1xuICAgICAgbWluWCA9IG5vZGUucG9zaXRpb24ueCA8IG1pblggPyBub2RlLnBvc2l0aW9uLnggOiBtaW5YO1xuICAgICAgbWluWSA9IG5vZGUucG9zaXRpb24ueSA8IG1pblkgPyBub2RlLnBvc2l0aW9uLnkgOiBtaW5ZO1xuICAgICAgbWF4WCA9IG5vZGUucG9zaXRpb24ueCArIG5vZGUuZGltZW5zaW9uLndpZHRoID4gbWF4WCA/IG5vZGUucG9zaXRpb24ueCArIG5vZGUuZGltZW5zaW9uLndpZHRoIDogbWF4WDtcbiAgICAgIG1heFkgPSBub2RlLnBvc2l0aW9uLnkgKyBub2RlLmRpbWVuc2lvbi5oZWlnaHQgPiBtYXhZID8gbm9kZS5wb3NpdGlvbi55ICsgbm9kZS5kaW1lbnNpb24uaGVpZ2h0IDogbWF4WTtcbiAgICB9XG5cbiAgICAvLyBXaGVuIGNsdXN0ZXJzIGFyZSBwcmVzZW50LCBsZWF2ZSByb29tIGFyb3VuZCB0aGUgZ3JhcGhcbiAgICAvLyB0byBhY2NvdW50IGZvciBoZWlnaHQgYW5kIHdpZHRoIHRoZXkgY2FuIGFkZCB0byB0aGUgZGltZW5zaW9ucy5cbiAgICAvLyBJdGVyYXRpbmcgdGhyb3VnaCB0aGUgZ3JhcGggY2x1c3RlcnMgYW5kIG1pbi9tYXhpbmdcbiAgICAvLyB0aGVpciBwb3NpdGlvbiBhbmQgZGltZW5zaW9uIGRpZG4ndCB3b3JrLlxuICAgIC8vIFRoZSBncmFwaCBjYWxjdWxhdGVkIHNpemUgd2FzIHN0aWxsIHRvbyBsb3cgYW5kIHNvbWUgbm9kZXNcbiAgICAvLyB3ZXJlIHJlbmRlcmVkIG91dHNpZGUgb2YgdGhlIHZpZXcgd2hlbiB1c2luZyB6b29tVG9GaXQuXG4gICAgLy8gV2l0aG91dCBjbHVzdGVycywgdXNpbmcgZGFncmUsIHRoZSBleHRyYSBzcGFjaW5nIGFsbCBhcm91bmRcbiAgICAvLyBjYXVzZXMgdGhlIGdyYXBoIHRvIGJlIHNoaWZ0ZWQgdXAvbGVmdCBpbnN0ZWFkIG9mIGJlaW5nIGNlbnRlcmVkLlxuICAgIGlmICh0aGlzLmdyYXBoLmNsdXN0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1pblggLT0gMTAwO1xuICAgICAgbWluWSAtPSAxMDA7XG4gICAgICBtYXhYICs9IDEwMDtcbiAgICAgIG1heFkgKz0gMTAwO1xuICAgIH1cblxuICAgIHRoaXMuZ3JhcGhEaW1zLndpZHRoID0gbWF4WCAtIG1pblg7XG4gICAgdGhpcy5ncmFwaERpbXMuaGVpZ2h0ID0gbWF4WSAtIG1pblk7XG4gICAgdGhpcy5taW5pbWFwT2Zmc2V0WCA9IG1pblg7XG4gICAgdGhpcy5taW5pbWFwT2Zmc2V0WSA9IG1pblk7XG4gIH1cblxuICBAdGhyb3R0bGVhYmxlKDUwMClcbiAgdXBkYXRlTWluaW1hcCgpIHtcbiAgICAvLyBDYWxjdWxhdGUgdGhlIGhlaWdodC93aWR0aCB0b3RhbCwgYnV0IG9ubHkgaWYgd2UgaGF2ZSBhbnkgbm9kZXNcbiAgICBpZiAodGhpcy5ncmFwaC5ub2RlcyAmJiB0aGlzLmdyYXBoLm5vZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy51cGRhdGVHcmFwaERpbXMoKTtcblxuICAgICAgaWYgKHRoaXMubWluaU1hcE1heFdpZHRoKSB7XG4gICAgICAgIHRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQgPSB0aGlzLmdyYXBoRGltcy53aWR0aCAvIHRoaXMubWluaU1hcE1heFdpZHRoO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMubWluaU1hcE1heEhlaWdodCkge1xuICAgICAgICB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50ID0gTWF0aC5tYXgoXG4gICAgICAgICAgdGhpcy5taW5pbWFwU2NhbGVDb2VmZmljaWVudCxcbiAgICAgICAgICB0aGlzLmdyYXBoRGltcy5oZWlnaHQgLyB0aGlzLm1pbmlNYXBNYXhIZWlnaHRcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5taW5pbWFwVHJhbnNmb3JtID0gdGhpcy5nZXRNaW5pbWFwVHJhbnNmb3JtKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1lYXN1cmVzIHRoZSBub2RlIGVsZW1lbnQgYW5kIGFwcGxpZXMgdGhlIGRpbWVuc2lvbnNcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBhcHBseU5vZGVEaW1lbnNpb25zKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLm5vZGVFbGVtZW50cyAmJiB0aGlzLm5vZGVFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMubm9kZUVsZW1lbnRzLm1hcChlbGVtID0+IHtcbiAgICAgICAgY29uc3QgbmF0aXZlRWxlbWVudCA9IGVsZW0ubmF0aXZlRWxlbWVudDtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ3JhcGgubm9kZXMuZmluZChuID0+IG4uaWQgPT09IG5hdGl2ZUVsZW1lbnQuaWQpO1xuICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIGhlaWdodFxuICAgICAgICBsZXQgZGltcztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkaW1zID0gbmF0aXZlRWxlbWVudC5nZXRCQm94KCk7XG4gICAgICAgICAgaWYgKCFkaW1zLndpZHRoIHx8ICFkaW1zLmhlaWdodCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAvLyBTa2lwIGRyYXdpbmcgaWYgZWxlbWVudCBpcyBub3QgZGlzcGxheWVkIC0gRmlyZWZveCB3b3VsZCB0aHJvdyBhbiBlcnJvciBoZXJlXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGVIZWlnaHQpIHtcbiAgICAgICAgICBub2RlLmRpbWVuc2lvbi5oZWlnaHQgPVxuICAgICAgICAgICAgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ICYmIG5vZGUubWV0YS5mb3JjZURpbWVuc2lvbnMgPyBub2RlLmRpbWVuc2lvbi5oZWlnaHQgOiB0aGlzLm5vZGVIZWlnaHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ID1cbiAgICAgICAgICAgIG5vZGUuZGltZW5zaW9uLmhlaWdodCAmJiBub2RlLm1ldGEuZm9yY2VEaW1lbnNpb25zID8gbm9kZS5kaW1lbnNpb24uaGVpZ2h0IDogZGltcy5oZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5ub2RlTWF4SGVpZ2h0KSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ID0gTWF0aC5tYXgobm9kZS5kaW1lbnNpb24uaGVpZ2h0LCB0aGlzLm5vZGVNYXhIZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGVNaW5IZWlnaHQpIHtcbiAgICAgICAgICBub2RlLmRpbWVuc2lvbi5oZWlnaHQgPSBNYXRoLm1pbihub2RlLmRpbWVuc2lvbi5oZWlnaHQsIHRoaXMubm9kZU1pbkhlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5ub2RlV2lkdGgpIHtcbiAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCA9XG4gICAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCAmJiBub2RlLm1ldGEuZm9yY2VEaW1lbnNpb25zID8gbm9kZS5kaW1lbnNpb24ud2lkdGggOiB0aGlzLm5vZGVXaWR0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIHdpZHRoXG4gICAgICAgICAgaWYgKG5hdGl2ZUVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RleHQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxldCBtYXhUZXh0RGltcztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgdGV4dEVsZW0gb2YgbmF0aXZlRWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGV4dCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudEJCb3ggPSB0ZXh0RWxlbS5nZXRCQm94KCk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXhUZXh0RGltcykge1xuICAgICAgICAgICAgICAgICAgbWF4VGV4dERpbXMgPSBjdXJyZW50QkJveDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRCQm94LndpZHRoID4gbWF4VGV4dERpbXMud2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4VGV4dERpbXMud2lkdGggPSBjdXJyZW50QkJveC53aWR0aDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QkJveC5oZWlnaHQgPiBtYXhUZXh0RGltcy5oZWlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4VGV4dERpbXMuaGVpZ2h0ID0gY3VycmVudEJCb3guaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgLy8gU2tpcCBkcmF3aW5nIGlmIGVsZW1lbnQgaXMgbm90IGRpc3BsYXllZCAtIEZpcmVmb3ggd291bGQgdGhyb3cgYW4gZXJyb3IgaGVyZVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCA9XG4gICAgICAgICAgICAgIG5vZGUuZGltZW5zaW9uLndpZHRoICYmIG5vZGUubWV0YS5mb3JjZURpbWVuc2lvbnMgPyBub2RlLmRpbWVuc2lvbi53aWR0aCA6IG1heFRleHREaW1zLndpZHRoICsgMjA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vZGUuZGltZW5zaW9uLndpZHRoID1cbiAgICAgICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggJiYgbm9kZS5tZXRhLmZvcmNlRGltZW5zaW9ucyA/IG5vZGUuZGltZW5zaW9uLndpZHRoIDogZGltcy53aWR0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5ub2RlTWF4V2lkdGgpIHtcbiAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCA9IE1hdGgubWF4KG5vZGUuZGltZW5zaW9uLndpZHRoLCB0aGlzLm5vZGVNYXhXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZU1pbldpZHRoKSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggPSBNYXRoLm1pbihub2RlLmRpbWVuc2lvbi53aWR0aCwgdGhpcy5ub2RlTWluV2lkdGgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVkcmF3cyB0aGUgbGluZXMgd2hlbiBkcmFnZ2VkIG9yIHZpZXdwb3J0IHVwZGF0ZWRcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICByZWRyYXdMaW5lcyhfYW5pbWF0ZSA9IHRoaXMuYW5pbWF0ZSk6IHZvaWQge1xuICAgIHRoaXMubGlua0VsZW1lbnRzLm1hcChsaW5rRWwgPT4ge1xuICAgICAgY29uc3QgZWRnZSA9IHRoaXMuZ3JhcGguZWRnZXMuZmluZChsaW4gPT4gbGluLmlkID09PSBsaW5rRWwubmF0aXZlRWxlbWVudC5pZCk7XG5cbiAgICAgIGlmIChlZGdlKSB7XG4gICAgICAgIGNvbnN0IGxpbmtTZWxlY3Rpb24gPSBzZWxlY3QobGlua0VsLm5hdGl2ZUVsZW1lbnQpLnNlbGVjdCgnLmxpbmUnKTtcbiAgICAgICAgbGlua1NlbGVjdGlvblxuICAgICAgICAgIC5hdHRyKCdkJywgZWRnZS5vbGRMaW5lKVxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAuZWFzZShlYXNlLmVhc2VTaW5Jbk91dClcbiAgICAgICAgICAuZHVyYXRpb24oX2FuaW1hdGUgPyA1MDAgOiAwKVxuICAgICAgICAgIC5hdHRyKCdkJywgZWRnZS5saW5lKTtcblxuICAgICAgICBjb25zdCB0ZXh0UGF0aFNlbGVjdGlvbiA9IHNlbGVjdCh0aGlzLmVsLm5hdGl2ZUVsZW1lbnQpLnNlbGVjdChgIyR7ZWRnZS5pZH1gKTtcbiAgICAgICAgdGV4dFBhdGhTZWxlY3Rpb25cbiAgICAgICAgICAuYXR0cignZCcsIGVkZ2Uub2xkVGV4dFBhdGgpXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5lYXNlKGVhc2UuZWFzZVNpbkluT3V0KVxuICAgICAgICAgIC5kdXJhdGlvbihfYW5pbWF0ZSA/IDUwMCA6IDApXG4gICAgICAgICAgLmF0dHIoJ2QnLCBlZGdlLnRleHRQYXRoKTtcblxuICAgICAgICB0aGlzLnVwZGF0ZU1pZHBvaW50T25FZGdlKGVkZ2UsIGVkZ2UucG9pbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgdGhlIHRleHQgZGlyZWN0aW9ucyAvIGZsaXBwaW5nXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgY2FsY0RvbWluYW50QmFzZWxpbmUobGluayk6IHZvaWQge1xuICAgIGNvbnN0IGZpcnN0UG9pbnQgPSBsaW5rLnBvaW50c1swXTtcbiAgICBjb25zdCBsYXN0UG9pbnQgPSBsaW5rLnBvaW50c1tsaW5rLnBvaW50cy5sZW5ndGggLSAxXTtcbiAgICBsaW5rLm9sZFRleHRQYXRoID0gbGluay50ZXh0UGF0aDtcblxuICAgIGlmIChsYXN0UG9pbnQueCA8IGZpcnN0UG9pbnQueCkge1xuICAgICAgbGluay5kb21pbmFudEJhc2VsaW5lID0gJ3RleHQtYmVmb3JlLWVkZ2UnO1xuXG4gICAgICAvLyByZXZlcnNlIHRleHQgcGF0aCBmb3Igd2hlbiBpdHMgZmxpcHBlZCB1cHNpZGUgZG93blxuICAgICAgbGluay50ZXh0UGF0aCA9IHRoaXMuZ2VuZXJhdGVMaW5lKFsuLi5saW5rLnBvaW50c10ucmV2ZXJzZSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGluay5kb21pbmFudEJhc2VsaW5lID0gJ3RleHQtYWZ0ZXItZWRnZSc7XG4gICAgICBsaW5rLnRleHRQYXRoID0gbGluay5saW5lO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSB0aGUgbmV3IGxpbmUgcGF0aFxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIGdlbmVyYXRlTGluZShwb2ludHM6IGFueSk6IGFueSB7XG4gICAgY29uc3QgbGluZUZ1bmN0aW9uID0gc2hhcGVcbiAgICAgIC5saW5lPGFueT4oKVxuICAgICAgLngoZCA9PiBkLngpXG4gICAgICAueShkID0+IGQueSlcbiAgICAgIC5jdXJ2ZSh0aGlzLmN1cnZlKTtcbiAgICByZXR1cm4gbGluZUZ1bmN0aW9uKHBvaW50cyk7XG4gIH1cblxuICAvKipcbiAgICogWm9vbSB3YXMgaW52b2tlZCBmcm9tIGV2ZW50XG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25ab29tKCRldmVudDogV2hlZWxFdmVudCwgZGlyZWN0aW9uKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZW5hYmxlVHJhY2twYWRTdXBwb3J0ICYmICEkZXZlbnQuY3RybEtleSkge1xuICAgICAgdGhpcy5wYW4oJGV2ZW50LmRlbHRhWCAqIC0xLCAkZXZlbnQuZGVsdGFZICogLTEpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHpvb21GYWN0b3IgPSAxICsgKGRpcmVjdGlvbiA9PT0gJ2luJyA/IHRoaXMuem9vbVNwZWVkIDogLXRoaXMuem9vbVNwZWVkKTtcblxuICAgIC8vIENoZWNrIHRoYXQgem9vbWluZyB3b3VsZG4ndCBwdXQgdXMgb3V0IG9mIGJvdW5kc1xuICAgIGNvbnN0IG5ld1pvb21MZXZlbCA9IHRoaXMuem9vbUxldmVsICogem9vbUZhY3RvcjtcbiAgICBpZiAobmV3Wm9vbUxldmVsIDw9IHRoaXMubWluWm9vbUxldmVsIHx8IG5ld1pvb21MZXZlbCA+PSB0aGlzLm1heFpvb21MZXZlbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHpvb21pbmcgaXMgZW5hYmxlZCBvciBub3RcbiAgICBpZiAoIXRoaXMuZW5hYmxlWm9vbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBhbk9uWm9vbSA9PT0gdHJ1ZSAmJiAkZXZlbnQpIHtcbiAgICAgIC8vIEFic29sdXRlIG1vdXNlIFgvWSBvbiB0aGUgc2NyZWVuXG4gICAgICBjb25zdCBtb3VzZVggPSAkZXZlbnQuY2xpZW50WDtcbiAgICAgIGNvbnN0IG1vdXNlWSA9ICRldmVudC5jbGllbnRZO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIG1vdXNlIFgvWSBpbnRvIGEgU1ZHIFgvWVxuICAgICAgY29uc3Qgc3ZnID0gdGhpcy5lbC5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ3N2ZycpO1xuICAgICAgY29uc3Qgc3ZnR3JvdXAgPSBzdmcucXVlcnlTZWxlY3RvcignZy5jaGFydCcpO1xuXG4gICAgICBjb25zdCBwb2ludCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpO1xuICAgICAgcG9pbnQueCA9IG1vdXNlWDtcbiAgICAgIHBvaW50LnkgPSBtb3VzZVk7XG4gICAgICBjb25zdCBzdmdQb2ludCA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShzdmdHcm91cC5nZXRTY3JlZW5DVE0oKS5pbnZlcnNlKCkpO1xuXG4gICAgICAvLyBQYW56b29tXG4gICAgICB0aGlzLnBhbihzdmdQb2ludC54LCBzdmdQb2ludC55LCB0cnVlKTtcbiAgICAgIHRoaXMuem9vbSh6b29tRmFjdG9yKTtcbiAgICAgIHRoaXMucGFuKC1zdmdQb2ludC54LCAtc3ZnUG9pbnQueSwgdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuem9vbSh6b29tRmFjdG9yKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFuIGJ5IHgveVxuICAgKlxuICAgKiBAcGFyYW0geFxuICAgKiBAcGFyYW0geVxuICAgKi9cbiAgcGFuKHg6IG51bWJlciwgeTogbnVtYmVyLCBpZ25vcmVab29tTGV2ZWw6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xuICAgIGNvbnN0IHpvb21MZXZlbCA9IGlnbm9yZVpvb21MZXZlbCA/IDEgOiB0aGlzLnpvb21MZXZlbDtcbiAgICB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4ID0gdHJhbnNmb3JtKHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXgsIHRyYW5zbGF0ZSh4IC8gem9vbUxldmVsLCB5IC8gem9vbUxldmVsKSk7XG5cbiAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhbiB0byBhIGZpeGVkIHgveVxuICAgKlxuICAgKi9cbiAgcGFuVG8oeDogbnVtYmVyLCB5OiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoeCA9PT0gbnVsbCB8fCB4ID09PSB1bmRlZmluZWQgfHwgaXNOYU4oeCkgfHwgeSA9PT0gbnVsbCB8fCB5ID09PSB1bmRlZmluZWQgfHwgaXNOYU4oeSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwYW5YID0gLXRoaXMucGFuT2Zmc2V0WCAtIHggKiB0aGlzLnpvb21MZXZlbCArIHRoaXMuZGltcy53aWR0aCAvIDI7XG4gICAgY29uc3QgcGFuWSA9IC10aGlzLnBhbk9mZnNldFkgLSB5ICogdGhpcy56b29tTGV2ZWwgKyB0aGlzLmRpbXMuaGVpZ2h0IC8gMjtcblxuICAgIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXggPSB0cmFuc2Zvcm0oXG4gICAgICB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4LFxuICAgICAgdHJhbnNsYXRlKHBhblggLyB0aGlzLnpvb21MZXZlbCwgcGFuWSAvIHRoaXMuem9vbUxldmVsKVxuICAgICk7XG5cbiAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFpvb20gYnkgYSBmYWN0b3JcbiAgICpcbiAgICovXG4gIHpvb20oZmFjdG9yOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4ID0gdHJhbnNmb3JtKHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXgsIHNjYWxlKGZhY3RvciwgZmFjdG9yKSk7XG4gICAgdGhpcy56b29tQ2hhbmdlLmVtaXQodGhpcy56b29tTGV2ZWwpO1xuICAgIHRoaXMudXBkYXRlVHJhbnNmb3JtKCk7XG4gIH1cblxuICAvKipcbiAgICogWm9vbSB0byBhIGZpeGVkIGxldmVsXG4gICAqXG4gICAqL1xuICB6b29tVG8obGV2ZWw6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXguYSA9IGlzTmFOKGxldmVsKSA/IHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXguYSA6IE51bWJlcihsZXZlbCk7XG4gICAgdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5kID0gaXNOYU4obGV2ZWwpID8gdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5kIDogTnVtYmVyKGxldmVsKTtcbiAgICB0aGlzLnpvb21DaGFuZ2UuZW1pdCh0aGlzLnpvb21MZXZlbCk7XG4gICAgdGhpcy51cGRhdGVUcmFuc2Zvcm0oKTtcbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIERyYWcgd2FzIGludm9rZWQgZnJvbSBhbiBldmVudFxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uRHJhZyhldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5kcmFnZ2luZ0VuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuZHJhZ2dpbmdOb2RlO1xuICAgIGlmICh0aGlzLmxheW91dCAmJiB0eXBlb2YgdGhpcy5sYXlvdXQgIT09ICdzdHJpbmcnICYmIHRoaXMubGF5b3V0Lm9uRHJhZykge1xuICAgICAgdGhpcy5sYXlvdXQub25EcmFnKG5vZGUsIGV2ZW50KTtcbiAgICB9XG5cbiAgICBub2RlLnBvc2l0aW9uLnggKz0gZXZlbnQubW92ZW1lbnRYIC8gdGhpcy56b29tTGV2ZWw7XG4gICAgbm9kZS5wb3NpdGlvbi55ICs9IGV2ZW50Lm1vdmVtZW50WSAvIHRoaXMuem9vbUxldmVsO1xuXG4gICAgLy8gbW92ZSB0aGUgbm9kZVxuICAgIGNvbnN0IHggPSBub2RlLnBvc2l0aW9uLnggLSBub2RlLmRpbWVuc2lvbi53aWR0aCAvIDI7XG4gICAgY29uc3QgeSA9IG5vZGUucG9zaXRpb24ueSAtIG5vZGUuZGltZW5zaW9uLmhlaWdodCAvIDI7XG4gICAgbm9kZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7eH0sICR7eX0pYDtcblxuICAgIGZvciAoY29uc3QgbGluayBvZiB0aGlzLmdyYXBoLmVkZ2VzKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGxpbmsudGFyZ2V0ID09PSBub2RlLmlkIHx8XG4gICAgICAgIGxpbmsuc291cmNlID09PSBub2RlLmlkIHx8XG4gICAgICAgIChsaW5rLnRhcmdldCBhcyBhbnkpLmlkID09PSBub2RlLmlkIHx8XG4gICAgICAgIChsaW5rLnNvdXJjZSBhcyBhbnkpLmlkID09PSBub2RlLmlkXG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMubGF5b3V0ICYmIHR5cGVvZiB0aGlzLmxheW91dCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxheW91dC51cGRhdGVFZGdlKHRoaXMuZ3JhcGgsIGxpbmspO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCQgPSByZXN1bHQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlID8gcmVzdWx0IDogb2YocmVzdWx0KTtcbiAgICAgICAgICB0aGlzLmdyYXBoU3Vic2NyaXB0aW9uLmFkZChcbiAgICAgICAgICAgIHJlc3VsdCQuc3Vic2NyaWJlKGdyYXBoID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5ncmFwaCA9IGdyYXBoO1xuICAgICAgICAgICAgICB0aGlzLnJlZHJhd0VkZ2UobGluayk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlZHJhd0xpbmVzKGZhbHNlKTtcbiAgICB0aGlzLnVwZGF0ZU1pbmltYXAoKTtcbiAgfVxuXG4gIHJlZHJhd0VkZ2UoZWRnZTogRWRnZSkge1xuICAgIGNvbnN0IGxpbmUgPSB0aGlzLmdlbmVyYXRlTGluZShlZGdlLnBvaW50cyk7XG4gICAgdGhpcy5jYWxjRG9taW5hbnRCYXNlbGluZShlZGdlKTtcbiAgICBlZGdlLm9sZExpbmUgPSBlZGdlLmxpbmU7XG4gICAgZWRnZS5saW5lID0gbGluZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIGVudGlyZSB2aWV3IGZvciB0aGUgbmV3IHBhbiBwb3NpdGlvblxuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIHVwZGF0ZVRyYW5zZm9ybSgpOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zZm9ybSA9IHRvU1ZHKHNtb290aE1hdHJpeCh0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4LCAxMDApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb2RlIHdhcyBjbGlja2VkXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25DbGljayhldmVudDogYW55KTogdm9pZCB7XG4gICAgdGhpcy5zZWxlY3QuZW1pdChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogTm9kZSB3YXMgZm9jdXNlZFxuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uQWN0aXZhdGUoZXZlbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hY3RpdmVFbnRyaWVzLmluZGV4T2YoZXZlbnQpID4gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hY3RpdmVFbnRyaWVzID0gW2V2ZW50LCAuLi50aGlzLmFjdGl2ZUVudHJpZXNdO1xuICAgIHRoaXMuYWN0aXZhdGUuZW1pdCh7IHZhbHVlOiBldmVudCwgZW50cmllczogdGhpcy5hY3RpdmVFbnRyaWVzIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vZGUgd2FzIGRlZm9jdXNlZFxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uRGVhY3RpdmF0ZShldmVudCk6IHZvaWQge1xuICAgIGNvbnN0IGlkeCA9IHRoaXMuYWN0aXZlRW50cmllcy5pbmRleE9mKGV2ZW50KTtcblxuICAgIHRoaXMuYWN0aXZlRW50cmllcy5zcGxpY2UoaWR4LCAxKTtcbiAgICB0aGlzLmFjdGl2ZUVudHJpZXMgPSBbLi4udGhpcy5hY3RpdmVFbnRyaWVzXTtcblxuICAgIHRoaXMuZGVhY3RpdmF0ZS5lbWl0KHsgdmFsdWU6IGV2ZW50LCBlbnRyaWVzOiB0aGlzLmFjdGl2ZUVudHJpZXMgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBkb21haW4gc2VyaWVzIGZvciB0aGUgbm9kZXNcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBnZXRTZXJpZXNEb21haW4oKTogYW55W10ge1xuICAgIHJldHVybiB0aGlzLm5vZGVzXG4gICAgICAubWFwKGQgPT4gdGhpcy5ncm91cFJlc3VsdHNCeShkKSlcbiAgICAgIC5yZWR1Y2UoKG5vZGVzOiBzdHJpbmdbXSwgbm9kZSk6IGFueVtdID0+IChub2Rlcy5pbmRleE9mKG5vZGUpICE9PSAtMSA/IG5vZGVzIDogbm9kZXMuY29uY2F0KFtub2RlXSkpLCBbXSlcbiAgICAgIC5zb3J0KCk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2tpbmcgZm9yIHRoZSBsaW5rXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgdHJhY2tMaW5rQnkoaW5kZXg6IG51bWJlciwgbGluazogRWRnZSk6IGFueSB7XG4gICAgcmV0dXJuIGxpbmsuaWQ7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2tpbmcgZm9yIHRoZSBub2RlXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgdHJhY2tOb2RlQnkoaW5kZXg6IG51bWJlciwgbm9kZTogTm9kZSk6IGFueSB7XG4gICAgcmV0dXJuIG5vZGUuaWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY29sb3JzIHRoZSBub2Rlc1xuICAgKlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIHNldENvbG9ycygpOiB2b2lkIHtcbiAgICB0aGlzLmNvbG9ycyA9IG5ldyBDb2xvckhlbHBlcih0aGlzLnNjaGVtZSwgdGhpcy5zZXJpZXNEb21haW4sIHRoaXMuY3VzdG9tQ29sb3JzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbiBtb3VzZSBtb3ZlIGV2ZW50LCB1c2VkIGZvciBwYW5uaW5nIGFuZCBkcmFnZ2luZy5cbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBASG9zdExpc3RlbmVyKCdkb2N1bWVudDptb3VzZW1vdmUnLCBbJyRldmVudCddKVxuICBvbk1vdXNlTW92ZSgkZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmlzTW91c2VNb3ZlQ2FsbGVkID0gdHJ1ZTtcbiAgICBpZiAoKHRoaXMuaXNQYW5uaW5nIHx8IHRoaXMuaXNNaW5pbWFwUGFubmluZykgJiYgdGhpcy5wYW5uaW5nRW5hYmxlZCkge1xuICAgICAgdGhpcy5wYW5XaXRoQ29uc3RyYWludHModGhpcy5wYW5uaW5nQXhpcywgJGV2ZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNEcmFnZ2luZyAmJiB0aGlzLmRyYWdnaW5nRW5hYmxlZCkge1xuICAgICAgdGhpcy5vbkRyYWcoJGV2ZW50KTtcbiAgICB9XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdkb2N1bWVudDptb3VzZWRvd24nLCBbJyRldmVudCddKVxuICBvbk1vdXNlRG93bihldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuaXNNb3VzZU1vdmVDYWxsZWQgPSBmYWxzZTtcbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50OmNsaWNrJywgWyckZXZlbnQnXSlcbiAgZ3JhcGhDbGljayhldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc01vdXNlTW92ZUNhbGxlZCkgdGhpcy5jbGlja0hhbmRsZXIuZW1pdChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogT24gdG91Y2ggc3RhcnQgZXZlbnQgdG8gZW5hYmxlIHBhbm5pbmcuXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25Ub3VjaFN0YXJ0KGV2ZW50OiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLl90b3VjaExhc3RYID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICB0aGlzLl90b3VjaExhc3RZID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF0uY2xpZW50WTtcblxuICAgIHRoaXMuaXNQYW5uaW5nID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbiB0b3VjaCBtb3ZlIGV2ZW50LCB1c2VkIGZvciBwYW5uaW5nLlxuICAgKlxuICAgKi9cbiAgQEhvc3RMaXN0ZW5lcignZG9jdW1lbnQ6dG91Y2htb3ZlJywgWyckZXZlbnQnXSlcbiAgb25Ub3VjaE1vdmUoJGV2ZW50OiBhbnkpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc1Bhbm5pbmcgJiYgdGhpcy5wYW5uaW5nRW5hYmxlZCkge1xuICAgICAgY29uc3QgY2xpZW50WCA9ICRldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRYO1xuICAgICAgY29uc3QgY2xpZW50WSA9ICRldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRZO1xuICAgICAgY29uc3QgbW92ZW1lbnRYID0gY2xpZW50WCAtIHRoaXMuX3RvdWNoTGFzdFg7XG4gICAgICBjb25zdCBtb3ZlbWVudFkgPSBjbGllbnRZIC0gdGhpcy5fdG91Y2hMYXN0WTtcbiAgICAgIHRoaXMuX3RvdWNoTGFzdFggPSBjbGllbnRYO1xuICAgICAgdGhpcy5fdG91Y2hMYXN0WSA9IGNsaWVudFk7XG5cbiAgICAgIHRoaXMucGFuKG1vdmVtZW50WCwgbW92ZW1lbnRZKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT24gdG91Y2ggZW5kIGV2ZW50IHRvIGRpc2FibGUgcGFubmluZy5cbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvblRvdWNoRW5kKGV2ZW50OiBhbnkpIHtcbiAgICB0aGlzLmlzUGFubmluZyA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIE9uIG1vdXNlIHVwIGV2ZW50IHRvIGRpc2FibGUgcGFubmluZy9kcmFnZ2luZy5cbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBASG9zdExpc3RlbmVyKCdkb2N1bWVudDptb3VzZXVwJywgWyckZXZlbnQnXSlcbiAgb25Nb3VzZVVwKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgdGhpcy5pc1Bhbm5pbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzTWluaW1hcFBhbm5pbmcgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5sYXlvdXQgJiYgdHlwZW9mIHRoaXMubGF5b3V0ICE9PSAnc3RyaW5nJyAmJiB0aGlzLmxheW91dC5vbkRyYWdFbmQpIHtcbiAgICAgIHRoaXMubGF5b3V0Lm9uRHJhZ0VuZCh0aGlzLmRyYWdnaW5nTm9kZSwgZXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPbiBub2RlIG1vdXNlIGRvd24gdG8ga2ljayBvZmYgZHJhZ2dpbmdcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvbk5vZGVNb3VzZURvd24oZXZlbnQ6IE1vdXNlRXZlbnQsIG5vZGU6IGFueSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5kcmFnZ2luZ0VuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmRyYWdnaW5nTm9kZSA9IG5vZGU7XG5cbiAgICBpZiAodGhpcy5sYXlvdXQgJiYgdHlwZW9mIHRoaXMubGF5b3V0ICE9PSAnc3RyaW5nJyAmJiB0aGlzLmxheW91dC5vbkRyYWdTdGFydCkge1xuICAgICAgdGhpcy5sYXlvdXQub25EcmFnU3RhcnQobm9kZSwgZXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPbiBtaW5pbWFwIGRyYWcgbW91c2UgZG93biB0byBraWNrIG9mZiBtaW5pbWFwIHBhbm5pbmdcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvbk1pbmltYXBEcmFnTW91c2VEb3duKCk6IHZvaWQge1xuICAgIHRoaXMuaXNNaW5pbWFwUGFubmluZyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogT24gbWluaW1hcCBwYW4gZXZlbnQuIFBhbnMgdGhlIGdyYXBoIHRvIHRoZSBjbGlja2VkIHBvc2l0aW9uXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25NaW5pbWFwUGFuVG8oZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICBjb25zdCB4ID1cbiAgICAgIGV2ZW50Lm9mZnNldFggLSAodGhpcy5kaW1zLndpZHRoIC0gKHRoaXMuZ3JhcGhEaW1zLndpZHRoICsgdGhpcy5taW5pbWFwT2Zmc2V0WCkgLyB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50KTtcbiAgICBjb25zdCB5ID0gZXZlbnQub2Zmc2V0WSArIHRoaXMubWluaW1hcE9mZnNldFkgLyB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50O1xuXG4gICAgdGhpcy5wYW5Ubyh4ICogdGhpcy5taW5pbWFwU2NhbGVDb2VmZmljaWVudCwgeSAqIHRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQpO1xuICAgIHRoaXMuaXNNaW5pbWFwUGFubmluZyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2VudGVyIHRoZSBncmFwaCBpbiB0aGUgdmlld3BvcnRcbiAgICovXG4gIGNlbnRlcigpOiB2b2lkIHtcbiAgICB0aGlzLnBhblRvKHRoaXMuZ3JhcGhEaW1zLndpZHRoIC8gMiwgdGhpcy5ncmFwaERpbXMuaGVpZ2h0IC8gMik7XG4gIH1cblxuICAvKipcbiAgICogWm9vbXMgdG8gZml0IHRoZSBlbnRpZXIgZ3JhcGhcbiAgICovXG4gIHpvb21Ub0ZpdCgpOiB2b2lkIHtcblxuICAgIGNvbnN0IG1hcmdpbiA9IHtcbiAgICAgIHg6IHRoaXMuem9vbVRvRml0TWFyZ2luPy54IHx8IDAsXG4gICAgICB5OiB0aGlzLnpvb21Ub0ZpdE1hcmdpbj8ueSB8fCAwLFxuICAgIH1cblxuICAgIC8vIE1hcmdpbiB2YWx1ZSBpcyB4MiBmb3IgdG9wL2JvdHRvbSBhbmQgbGVmdC9yaWdodFxuICAgIGNvbnN0IGhlaWdodFpvb20gPSB0aGlzLmRpbXMuaGVpZ2h0IC8gKHRoaXMuZ3JhcGhEaW1zLmhlaWdodCArIG1hcmdpbi55ICogMik7XG4gICAgY29uc3Qgd2lkdGhab29tID0gdGhpcy5kaW1zLndpZHRoIC8gKHRoaXMuZ3JhcGhEaW1zLndpZHRoICsgbWFyZ2luLnggKiAyKTtcbiAgICBsZXQgem9vbUxldmVsID0gTWF0aC5taW4oaGVpZ2h0Wm9vbSwgd2lkdGhab29tLCAxKTtcblxuICAgIGlmICh6b29tTGV2ZWwgPCB0aGlzLm1pblpvb21MZXZlbCkge1xuICAgICAgem9vbUxldmVsID0gdGhpcy5taW5ab29tTGV2ZWw7XG4gICAgfVxuXG4gICAgaWYgKHpvb21MZXZlbCA+IHRoaXMubWF4Wm9vbUxldmVsKSB7XG4gICAgICB6b29tTGV2ZWwgPSB0aGlzLm1heFpvb21MZXZlbDtcbiAgICB9XG5cbiAgICBpZiAoem9vbUxldmVsICE9PSB0aGlzLnpvb21MZXZlbCkge1xuICAgICAgdGhpcy56b29tTGV2ZWwgPSB6b29tTGV2ZWw7XG4gICAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpO1xuICAgICAgdGhpcy56b29tQ2hhbmdlLmVtaXQodGhpcy56b29tTGV2ZWwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYW5zIHRvIHRoZSBub2RlXG4gICAqIEBwYXJhbSBub2RlSWRcbiAgICovXG4gIHBhblRvTm9kZUlkKG5vZGVJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMuZ3JhcGgubm9kZXMuZmluZChuID0+IG4uaWQgPT09IG5vZGVJZCk7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wYW5Ubyhub2RlLnBvc2l0aW9uLngsIG5vZGUucG9zaXRpb24ueSk7XG4gIH1cblxuICBwcml2YXRlIHBhbldpdGhDb25zdHJhaW50cyhrZXk6IHN0cmluZywgZXZlbnQ6IE1vdXNlRXZlbnQpIHtcbiAgICBsZXQgeCA9IGV2ZW50Lm1vdmVtZW50WDtcbiAgICBsZXQgeSA9IGV2ZW50Lm1vdmVtZW50WTtcbiAgICBpZiAodGhpcy5pc01pbmltYXBQYW5uaW5nKSB7XG4gICAgICB4ID0gLXRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQgKiB4ICogdGhpcy56b29tTGV2ZWw7XG4gICAgICB5ID0gLXRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQgKiB5ICogdGhpcy56b29tTGV2ZWw7XG4gICAgfVxuXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgIGNhc2UgUGFubmluZ0F4aXMuSG9yaXpvbnRhbDpcbiAgICAgICAgdGhpcy5wYW4oeCwgMCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBQYW5uaW5nQXhpcy5WZXJ0aWNhbDpcbiAgICAgICAgdGhpcy5wYW4oMCwgeSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5wYW4oeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlTWlkcG9pbnRPbkVkZ2UoZWRnZTogRWRnZSwgcG9pbnRzOiBhbnkpOiB2b2lkIHtcbiAgICBpZiAoIWVkZ2UgfHwgIXBvaW50cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwb2ludHMubGVuZ3RoICUgMiA9PT0gMSkge1xuICAgICAgZWRnZS5taWRQb2ludCA9IHBvaW50c1tNYXRoLmZsb29yKHBvaW50cy5sZW5ndGggLyAyKV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IF9maXJzdCA9IHBvaW50c1twb2ludHMubGVuZ3RoIC8gMl07XG4gICAgICBjb25zdCBfc2Vjb25kID0gcG9pbnRzW3BvaW50cy5sZW5ndGggLyAyIC0gMV07XG4gICAgICBlZGdlLm1pZFBvaW50ID0ge1xuICAgICAgICB4OiAoX2ZpcnN0LnggKyBfc2Vjb25kLngpIC8gMixcbiAgICAgICAgeTogKF9maXJzdC55ICsgX3NlY29uZC55KSAvIDJcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGJhc2ljVXBkYXRlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnZpZXcpIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnZpZXdbMF07XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudmlld1sxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGltcyA9IHRoaXMuZ2V0Q29udGFpbmVyRGltcygpO1xuICAgICAgaWYgKGRpbXMpIHtcbiAgICAgICAgdGhpcy53aWR0aCA9IGRpbXMud2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gZGltcy5oZWlnaHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZGVmYXVsdCB2YWx1ZXMgaWYgd2lkdGggb3IgaGVpZ2h0IGFyZSAwIG9yIHVuZGVmaW5lZFxuICAgIGlmICghdGhpcy53aWR0aCkge1xuICAgICAgdGhpcy53aWR0aCA9IDYwMDtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGVpZ2h0KSB7XG4gICAgICB0aGlzLmhlaWdodCA9IDQwMDtcbiAgICB9XG5cbiAgICB0aGlzLndpZHRoID0gTWF0aC5mbG9vcih0aGlzLndpZHRoKTtcbiAgICB0aGlzLmhlaWdodCA9IE1hdGguZmxvb3IodGhpcy5oZWlnaHQpO1xuXG4gICAgaWYgKHRoaXMuY2QpIHtcbiAgICAgIHRoaXMuY2QubWFya0ZvckNoZWNrKCk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGdldENvbnRhaW5lckRpbXMoKTogYW55IHtcbiAgICBsZXQgd2lkdGg7XG4gICAgbGV0IGhlaWdodDtcbiAgICBjb25zdCBob3N0RWxlbSA9IHRoaXMuZWwubmF0aXZlRWxlbWVudDtcblxuICAgIGlmIChob3N0RWxlbS5wYXJlbnROb2RlICE9PSBudWxsKSB7XG4gICAgICAvLyBHZXQgdGhlIGNvbnRhaW5lciBkaW1lbnNpb25zXG4gICAgICBjb25zdCBkaW1zID0gaG9zdEVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHdpZHRoID0gZGltcy53aWR0aDtcbiAgICAgIGhlaWdodCA9IGRpbXMuaGVpZ2h0O1xuICAgIH1cblxuICAgIGlmICh3aWR0aCAmJiBoZWlnaHQpIHtcbiAgICAgIHJldHVybiB7IHdpZHRoLCBoZWlnaHQgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByb3RlY3RlZCB1bmJpbmRFdmVudHMoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmVzaXplU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLnJlc2l6ZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYmluZFdpbmRvd1Jlc2l6ZUV2ZW50KCk6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZSA9IG9ic2VydmFibGVGcm9tRXZlbnQod2luZG93LCAncmVzaXplJyk7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gc291cmNlLnBpcGUoZGVib3VuY2VUaW1lKDIwMCkpLnN1YnNjcmliZShlID0+IHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICBpZiAodGhpcy5jZCkge1xuICAgICAgICB0aGlzLmNkLm1hcmtGb3JDaGVjaygpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucmVzaXplU3Vic2NyaXB0aW9uID0gc3Vic2NyaXB0aW9uO1xuICB9XG59XG4iLCI8ZGl2XG4gIGNsYXNzPVwibmd4LWNoYXJ0cy1vdXRlclwiXG4gIFtzdHlsZS53aWR0aC5weF09XCJ3aWR0aFwiXG4gIFtAYW5pbWF0aW9uU3RhdGVdPVwiJ2FjdGl2ZSdcIlxuICBbQC5kaXNhYmxlZF09XCIhYW5pbWF0aW9uc1wiXG4gIChtb3VzZVdoZWVsVXApPVwib25ab29tKCRldmVudCwgJ2luJylcIlxuICAobW91c2VXaGVlbERvd24pPVwib25ab29tKCRldmVudCwgJ291dCcpXCJcbiAgbW91c2VXaGVlbFxuPlxuICA8c3ZnOnN2ZyBjbGFzcz1cIm5neC1jaGFydHNcIiBbYXR0ci53aWR0aF09XCJ3aWR0aFwiIFthdHRyLmhlaWdodF09XCJoZWlnaHRcIj5cbiAgICA8c3ZnOmdcbiAgICAgICpuZ0lmPVwiaW5pdGlhbGl6ZWQgJiYgZ3JhcGhcIlxuICAgICAgW2F0dHIudHJhbnNmb3JtXT1cInRyYW5zZm9ybVwiXG4gICAgICAodG91Y2hzdGFydCk9XCJvblRvdWNoU3RhcnQoJGV2ZW50KVwiXG4gICAgICAodG91Y2hlbmQpPVwib25Ub3VjaEVuZCgkZXZlbnQpXCJcbiAgICAgIGNsYXNzPVwiZ3JhcGggY2hhcnRcIlxuICAgID5cbiAgICAgIDxkZWZzPlxuICAgICAgICA8bmctY29udGFpbmVyICpuZ0lmPVwiZGVmc1RlbXBsYXRlXCIgW25nVGVtcGxhdGVPdXRsZXRdPVwiZGVmc1RlbXBsYXRlXCI+PC9uZy1jb250YWluZXI+XG4gICAgICAgIDxzdmc6cGF0aFxuICAgICAgICAgIGNsYXNzPVwidGV4dC1wYXRoXCJcbiAgICAgICAgICAqbmdGb3I9XCJsZXQgbGluayBvZiBncmFwaC5lZGdlc1wiXG4gICAgICAgICAgW2F0dHIuZF09XCJsaW5rLnRleHRQYXRoXCJcbiAgICAgICAgICBbYXR0ci5pZF09XCJsaW5rLmlkXCJcbiAgICAgICAgPjwvc3ZnOnBhdGg+XG4gICAgICA8L2RlZnM+XG5cbiAgICAgIDxzdmc6cmVjdFxuICAgICAgICBjbGFzcz1cInBhbm5pbmctcmVjdFwiXG4gICAgICAgIFthdHRyLndpZHRoXT1cImRpbXMud2lkdGggKiAxMDBcIlxuICAgICAgICBbYXR0ci5oZWlnaHRdPVwiZGltcy5oZWlnaHQgKiAxMDBcIlxuICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwiJ3RyYW5zbGF0ZSgnICsgKC1kaW1zLndpZHRoIHx8IDApICogNTAgKyAnLCcgKyAoLWRpbXMuaGVpZ2h0IHx8IDApICogNTAgKyAnKSdcIlxuICAgICAgICAobW91c2Vkb3duKT1cImlzUGFubmluZyA9IHRydWVcIlxuICAgICAgLz5cblxuICAgICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuXG4gICAgICA8c3ZnOmcgY2xhc3M9XCJjbHVzdGVyc1wiPlxuICAgICAgICA8c3ZnOmdcbiAgICAgICAgICAjY2x1c3RlckVsZW1lbnRcbiAgICAgICAgICAqbmdGb3I9XCJsZXQgbm9kZSBvZiBncmFwaC5jbHVzdGVyczsgdHJhY2tCeTogdHJhY2tOb2RlQnlcIlxuICAgICAgICAgIGNsYXNzPVwibm9kZS1ncm91cFwiXG4gICAgICAgICAgW2NsYXNzLm9sZC1ub2RlXT1cImFuaW1hdGUgJiYgb2xkQ2x1c3RlcnMuaGFzKG5vZGUuaWQpXCJcbiAgICAgICAgICBbaWRdPVwibm9kZS5pZFwiXG4gICAgICAgICAgW2F0dHIudHJhbnNmb3JtXT1cIm5vZGUudHJhbnNmb3JtXCJcbiAgICAgICAgICAoY2xpY2spPVwib25DbGljayhub2RlKVwiXG4gICAgICAgID5cbiAgICAgICAgICA8bmctY29udGFpbmVyXG4gICAgICAgICAgICAqbmdJZj1cImNsdXN0ZXJUZW1wbGF0ZVwiXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldF09XCJjbHVzdGVyVGVtcGxhdGVcIlxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgJGltcGxpY2l0OiBub2RlIH1cIlxuICAgICAgICAgID48L25nLWNvbnRhaW5lcj5cbiAgICAgICAgICA8c3ZnOmcgKm5nSWY9XCIhY2x1c3RlclRlbXBsYXRlXCIgY2xhc3M9XCJub2RlIGNsdXN0ZXJcIj5cbiAgICAgICAgICAgIDxzdmc6cmVjdFxuICAgICAgICAgICAgICBbYXR0ci53aWR0aF09XCJub2RlLmRpbWVuc2lvbi53aWR0aFwiXG4gICAgICAgICAgICAgIFthdHRyLmhlaWdodF09XCJub2RlLmRpbWVuc2lvbi5oZWlnaHRcIlxuICAgICAgICAgICAgICBbYXR0ci5maWxsXT1cIm5vZGUuZGF0YT8uY29sb3JcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxzdmc6dGV4dCBhbGlnbm1lbnQtYmFzZWxpbmU9XCJjZW50cmFsXCIgW2F0dHIueF09XCIxMFwiIFthdHRyLnldPVwibm9kZS5kaW1lbnNpb24uaGVpZ2h0IC8gMlwiPlxuICAgICAgICAgICAgICB7eyBub2RlLmxhYmVsIH19XG4gICAgICAgICAgICA8L3N2Zzp0ZXh0PlxuICAgICAgICAgIDwvc3ZnOmc+XG4gICAgICAgIDwvc3ZnOmc+XG4gICAgICA8L3N2ZzpnPlxuXG4gICAgICA8c3ZnOmcgY2xhc3M9XCJsaW5rc1wiPlxuICAgICAgICA8c3ZnOmcgI2xpbmtFbGVtZW50ICpuZ0Zvcj1cImxldCBsaW5rIG9mIGdyYXBoLmVkZ2VzOyB0cmFja0J5OiB0cmFja0xpbmtCeVwiIGNsYXNzPVwibGluay1ncm91cFwiIFtpZF09XCJsaW5rLmlkXCI+XG4gICAgICAgICAgPG5nLWNvbnRhaW5lclxuICAgICAgICAgICAgKm5nSWY9XCJsaW5rVGVtcGxhdGVcIlxuICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibGlua1RlbXBsYXRlXCJcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogbGluayB9XCJcbiAgICAgICAgICA+PC9uZy1jb250YWluZXI+XG4gICAgICAgICAgPHN2ZzpwYXRoICpuZ0lmPVwiIWxpbmtUZW1wbGF0ZVwiIGNsYXNzPVwiZWRnZVwiIFthdHRyLmRdPVwibGluay5saW5lXCIgLz5cbiAgICAgICAgPC9zdmc6Zz5cbiAgICAgIDwvc3ZnOmc+XG5cbiAgICAgIDxzdmc6ZyBjbGFzcz1cIm5vZGVzXCI+XG4gICAgICAgIDxzdmc6Z1xuICAgICAgICAgICNub2RlRWxlbWVudFxuICAgICAgICAgICpuZ0Zvcj1cImxldCBub2RlIG9mIGdyYXBoLm5vZGVzOyB0cmFja0J5OiB0cmFja05vZGVCeVwiXG4gICAgICAgICAgY2xhc3M9XCJub2RlLWdyb3VwXCJcbiAgICAgICAgICBbY2xhc3Mub2xkLW5vZGVdPVwiYW5pbWF0ZSAmJiBvbGROb2Rlcy5oYXMobm9kZS5pZClcIlxuICAgICAgICAgIFtpZF09XCJub2RlLmlkXCJcbiAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwibm9kZS50cmFuc2Zvcm1cIlxuICAgICAgICAgIChjbGljayk9XCJvbkNsaWNrKG5vZGUpXCJcbiAgICAgICAgICAobW91c2Vkb3duKT1cIm9uTm9kZU1vdXNlRG93bigkZXZlbnQsIG5vZGUpXCJcbiAgICAgICAgPlxuICAgICAgICAgIDxuZy1jb250YWluZXJcbiAgICAgICAgICAgICpuZ0lmPVwibm9kZVRlbXBsYXRlXCJcbiAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5vZGVUZW1wbGF0ZVwiXG4gICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6IG5vZGUgfVwiXG4gICAgICAgICAgPjwvbmctY29udGFpbmVyPlxuICAgICAgICAgIDxzdmc6Y2lyY2xlXG4gICAgICAgICAgICAqbmdJZj1cIiFub2RlVGVtcGxhdGVcIlxuICAgICAgICAgICAgcj1cIjEwXCJcbiAgICAgICAgICAgIFthdHRyLmN4XT1cIm5vZGUuZGltZW5zaW9uLndpZHRoIC8gMlwiXG4gICAgICAgICAgICBbYXR0ci5jeV09XCJub2RlLmRpbWVuc2lvbi5oZWlnaHQgLyAyXCJcbiAgICAgICAgICAgIFthdHRyLmZpbGxdPVwibm9kZS5kYXRhPy5jb2xvclwiXG4gICAgICAgICAgLz5cbiAgICAgICAgPC9zdmc6Zz5cbiAgICAgIDwvc3ZnOmc+XG4gICAgPC9zdmc6Zz5cblxuICAgIDxzdmc6Y2xpcFBhdGggW2F0dHIuaWRdPVwibWluaW1hcENsaXBQYXRoSWRcIj5cbiAgICAgIDxzdmc6cmVjdFxuICAgICAgICBbYXR0ci53aWR0aF09XCJncmFwaERpbXMud2lkdGggLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudFwiXG4gICAgICAgIFthdHRyLmhlaWdodF09XCJncmFwaERpbXMuaGVpZ2h0IC8gbWluaW1hcFNjYWxlQ29lZmZpY2llbnRcIlxuICAgICAgPjwvc3ZnOnJlY3Q+XG4gICAgPC9zdmc6Y2xpcFBhdGg+XG5cbiAgICA8c3ZnOmdcbiAgICAgIGNsYXNzPVwibWluaW1hcFwiXG4gICAgICAqbmdJZj1cInNob3dNaW5pTWFwXCJcbiAgICAgIFthdHRyLnRyYW5zZm9ybV09XCJtaW5pbWFwVHJhbnNmb3JtXCJcbiAgICAgIFthdHRyLmNsaXAtcGF0aF09XCIndXJsKCMnICsgbWluaW1hcENsaXBQYXRoSWQgKyAnKSdcIlxuICAgID5cbiAgICAgIDxzdmc6cmVjdFxuICAgICAgICBjbGFzcz1cIm1pbmltYXAtYmFja2dyb3VuZFwiXG4gICAgICAgIFthdHRyLndpZHRoXT1cImdyYXBoRGltcy53aWR0aCAvIG1pbmltYXBTY2FsZUNvZWZmaWNpZW50XCJcbiAgICAgICAgW2F0dHIuaGVpZ2h0XT1cImdyYXBoRGltcy5oZWlnaHQgLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudFwiXG4gICAgICAgIChtb3VzZWRvd24pPVwib25NaW5pbWFwUGFuVG8oJGV2ZW50KVwiXG4gICAgICA+PC9zdmc6cmVjdD5cblxuICAgICAgPHN2ZzpnXG4gICAgICAgIFtzdHlsZS50cmFuc2Zvcm1dPVwiXG4gICAgICAgICAgJ3RyYW5zbGF0ZSgnICtcbiAgICAgICAgICAtbWluaW1hcE9mZnNldFggLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudCArXG4gICAgICAgICAgJ3B4LCcgK1xuICAgICAgICAgIC1taW5pbWFwT2Zmc2V0WSAvIG1pbmltYXBTY2FsZUNvZWZmaWNpZW50ICtcbiAgICAgICAgICAncHgpJ1xuICAgICAgICBcIlxuICAgICAgPlxuICAgICAgICA8c3ZnOmcgY2xhc3M9XCJtaW5pbWFwLW5vZGVzXCIgW3N0eWxlLnRyYW5zZm9ybV09XCInc2NhbGUoJyArIDEgLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudCArICcpJ1wiPlxuICAgICAgICAgIDxzdmc6Z1xuICAgICAgICAgICAgI25vZGVFbGVtZW50XG4gICAgICAgICAgICAqbmdGb3I9XCJsZXQgbm9kZSBvZiBncmFwaC5ub2RlczsgdHJhY2tCeTogdHJhY2tOb2RlQnlcIlxuICAgICAgICAgICAgY2xhc3M9XCJub2RlLWdyb3VwXCJcbiAgICAgICAgICAgIFtjbGFzcy5vbGQtbm9kZV09XCJhbmltYXRlICYmIG9sZE5vZGVzLmhhcyhub2RlLmlkKVwiXG4gICAgICAgICAgICBbaWRdPVwibm9kZS5pZFwiXG4gICAgICAgICAgICBbYXR0ci50cmFuc2Zvcm1dPVwibm9kZS50cmFuc2Zvcm1cIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxuZy1jb250YWluZXJcbiAgICAgICAgICAgICAgKm5nSWY9XCJtaW5pTWFwTm9kZVRlbXBsYXRlXCJcbiAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRdPVwibWluaU1hcE5vZGVUZW1wbGF0ZVwiXG4gICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogbm9kZSB9XCJcbiAgICAgICAgICAgID48L25nLWNvbnRhaW5lcj5cbiAgICAgICAgICAgIDxuZy1jb250YWluZXJcbiAgICAgICAgICAgICAgKm5nSWY9XCIhbWluaU1hcE5vZGVUZW1wbGF0ZSAmJiBub2RlVGVtcGxhdGVcIlxuICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldF09XCJub2RlVGVtcGxhdGVcIlxuICAgICAgICAgICAgICBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6IG5vZGUgfVwiXG4gICAgICAgICAgICA+PC9uZy1jb250YWluZXI+XG4gICAgICAgICAgICA8c3ZnOmNpcmNsZVxuICAgICAgICAgICAgICAqbmdJZj1cIiFub2RlVGVtcGxhdGUgJiYgIW1pbmlNYXBOb2RlVGVtcGxhdGVcIlxuICAgICAgICAgICAgICByPVwiMTBcIlxuICAgICAgICAgICAgICBbYXR0ci5jeF09XCJub2RlLmRpbWVuc2lvbi53aWR0aCAvIDIgLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudFwiXG4gICAgICAgICAgICAgIFthdHRyLmN5XT1cIm5vZGUuZGltZW5zaW9uLmhlaWdodCAvIDIgLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudFwiXG4gICAgICAgICAgICAgIFthdHRyLmZpbGxdPVwibm9kZS5kYXRhPy5jb2xvclwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvc3ZnOmc+XG4gICAgICAgIDwvc3ZnOmc+XG5cbiAgICAgICAgPHN2ZzpyZWN0XG4gICAgICAgICAgW2F0dHIudHJhbnNmb3JtXT1cIlxuICAgICAgICAgICAgJ3RyYW5zbGF0ZSgnICtcbiAgICAgICAgICAgIHBhbk9mZnNldFggLyB6b29tTGV2ZWwgLyAtbWluaW1hcFNjYWxlQ29lZmZpY2llbnQgK1xuICAgICAgICAgICAgJywnICtcbiAgICAgICAgICAgIHBhbk9mZnNldFkgLyB6b29tTGV2ZWwgLyAtbWluaW1hcFNjYWxlQ29lZmZpY2llbnQgK1xuICAgICAgICAgICAgJyknXG4gICAgICAgICAgXCJcbiAgICAgICAgICBjbGFzcz1cIm1pbmltYXAtZHJhZ1wiXG4gICAgICAgICAgW2NsYXNzLnBhbm5pbmddPVwiaXNNaW5pbWFwUGFubmluZ1wiXG4gICAgICAgICAgW2F0dHIud2lkdGhdPVwid2lkdGggLyBtaW5pbWFwU2NhbGVDb2VmZmljaWVudCAvIHpvb21MZXZlbFwiXG4gICAgICAgICAgW2F0dHIuaGVpZ2h0XT1cImhlaWdodCAvIG1pbmltYXBTY2FsZUNvZWZmaWNpZW50IC8gem9vbUxldmVsXCJcbiAgICAgICAgICAobW91c2Vkb3duKT1cIm9uTWluaW1hcERyYWdNb3VzZURvd24oKVwiXG4gICAgICAgID48L3N2ZzpyZWN0PlxuICAgICAgPC9zdmc6Zz5cbiAgICA8L3N2ZzpnPlxuICA8L3N2Zzpzdmc+XG48L2Rpdj5cbiJdfQ==