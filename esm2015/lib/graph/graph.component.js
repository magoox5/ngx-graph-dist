import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, ContentChild, ElementRef, EventEmitter, HostListener, Input, Output, QueryList, TemplateRef, ViewChild, ViewChildren, ViewEncapsulation, NgZone, ChangeDetectorRef } from '@angular/core';
import { BaseChartComponent, ChartComponent, ColorHelper, calculateViewDimensions } from '@swimlane/ngx-charts';
import { select } from 'd3-selection';
import * as shape from 'd3-shape';
import * as ease from 'd3-ease';
import 'd3-transition';
import { Observable, Subscription, of } from 'rxjs';
import { first } from 'rxjs/operators';
import { identity, scale, smoothMatrix, toSVG, transform, translate } from 'transformation-matrix';
import { LayoutService } from './layouts/layout.service';
import { id } from '../utils/id';
import { PanningAxis } from '../enums/panning.enum';
import { MiniMapPosition } from '../enums/mini-map-position.enum';
import { throttleable } from '../utils/throttle';
export class GraphComponent extends BaseChartComponent {
    constructor(el, zone, cd, layoutService) {
        super(el, zone, cd);
        this.el = el;
        this.zone = zone;
        this.cd = cd;
        this.layoutService = layoutService;
        this.legend = false;
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
        this.activate = new EventEmitter();
        this.deactivate = new EventEmitter();
        this.zoomChange = new EventEmitter();
        this.clickHandler = new EventEmitter();
        this.isMouseMoveCalled = false;
        this.graphSubscription = new Subscription();
        this.subscriptions = [];
        this.margin = [0, 0, 0, 0];
        this.results = [];
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
        super.ngOnDestroy();
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
        super.ngAfterViewInit();
        setTimeout(() => this.update());
    }
    /**
     * Base class update implementation for the dag graph
     *
     * @memberOf GraphComponent
     */
    update() {
        super.update();
        if (!this.curve) {
            this.curve = shape.curveBundle.beta(1);
        }
        this.zone.run(() => {
            this.dims = calculateViewDimensions({
                width: this.width,
                height: this.height,
                margins: this.margin,
                showLegend: this.legend
            });
            this.seriesDomain = this.getSeriesDomain();
            this.setColors();
            this.legendOptions = this.getLegendOptions();
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
            n.position = {
                x: 0,
                y: 0
            };
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
                const textPathSelection = select(this.chartElement.nativeElement).select(`#${edge.id}`);
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
            const svg = this.chart.nativeElement.querySelector('svg');
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
        this.colors = new ColorHelper(this.scheme, 'ordinal', this.seriesDomain, this.customColors);
    }
    /**
     * Gets the legend options
     *
     * @memberOf GraphComponent
     */
    getLegendOptions() {
        return {
            scaleType: 'ordinal',
            domain: this.seriesDomain,
            colors: this.colors
        };
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
        let x = event.offsetX - (this.dims.width - (this.graphDims.width + this.minimapOffsetX) / this.minimapScaleCoefficient);
        let y = event.offsetY + this.minimapOffsetY / this.minimapScaleCoefficient;
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
        var _a, _b;
        const margin = {
            x: ((_a = this.zoomToFitMargin) === null || _a === void 0 ? void 0 : _a.x) || 0,
            y: ((_b = this.zoomToFitMargin) === null || _b === void 0 ? void 0 : _b.y) || 0,
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
}
GraphComponent.decorators = [
    { type: Component, args: [{
                selector: 'ngx-graph',
                template: "<ngx-charts-chart\n  [view]=\"[width, height]\"\n  [showLegend]=\"legend\"\n  [legendOptions]=\"legendOptions\"\n  (legendLabelClick)=\"onClick($event)\"\n  (legendLabelActivate)=\"onActivate($event)\"\n  (legendLabelDeactivate)=\"onDeactivate($event)\"\n  mouseWheel\n  (mouseWheelUp)=\"onZoom($event, 'in')\"\n  (mouseWheelDown)=\"onZoom($event, 'out')\"\n>\n  <svg:g\n    *ngIf=\"initialized && graph\"\n    [attr.transform]=\"transform\"\n    (touchstart)=\"onTouchStart($event)\"\n    (touchend)=\"onTouchEnd($event)\"\n    class=\"graph chart\"\n  >\n    <defs>\n      <ng-container *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\"></ng-container>\n      <svg:path\n        class=\"text-path\"\n        *ngFor=\"let link of graph.edges\"\n        [attr.d]=\"link.textPath\"\n        [attr.id]=\"link.id\"\n      ></svg:path>\n    </defs>\n\n    <svg:rect\n      class=\"panning-rect\"\n      [attr.width]=\"dims.width * 100\"\n      [attr.height]=\"dims.height * 100\"\n      [attr.transform]=\"'translate(' + (-dims.width || 0) * 50 + ',' + (-dims.height || 0) * 50 + ')'\"\n      (mousedown)=\"isPanning = true\"\n    />\n\n    <ng-content></ng-content>\n\n    <svg:g class=\"clusters\">\n      <svg:g\n        #clusterElement\n        *ngFor=\"let node of graph.clusters; trackBy: trackNodeBy\"\n        class=\"node-group\"\n        [class.old-node]=\"animate && oldClusters.has(node.id)\"\n        [id]=\"node.id\"\n        [attr.transform]=\"node.transform\"\n        (click)=\"onClick(node)\"\n      >\n        <ng-container\n          *ngIf=\"clusterTemplate\"\n          [ngTemplateOutlet]=\"clusterTemplate\"\n          [ngTemplateOutletContext]=\"{ $implicit: node }\"\n        ></ng-container>\n        <svg:g *ngIf=\"!clusterTemplate\" class=\"node cluster\">\n          <svg:rect\n            [attr.width]=\"node.dimension.width\"\n            [attr.height]=\"node.dimension.height\"\n            [attr.fill]=\"node.data?.color\"\n          />\n          <svg:text alignment-baseline=\"central\" [attr.x]=\"10\" [attr.y]=\"node.dimension.height / 2\">\n            {{ node.label }}\n          </svg:text>\n        </svg:g>\n      </svg:g>\n    </svg:g>\n\n    <svg:g class=\"links\">\n      <svg:g #linkElement *ngFor=\"let link of graph.edges; trackBy: trackLinkBy\" class=\"link-group\" [id]=\"link.id\">\n        <ng-container\n          *ngIf=\"linkTemplate\"\n          [ngTemplateOutlet]=\"linkTemplate\"\n          [ngTemplateOutletContext]=\"{ $implicit: link }\"\n        ></ng-container>\n        <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n      </svg:g>\n    </svg:g>\n\n    <svg:g class=\"nodes\">\n      <svg:g\n        #nodeElement\n        *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n        class=\"node-group\"\n        [class.old-node]=\"animate && oldNodes.has(node.id)\"\n        [id]=\"node.id\"\n        [attr.transform]=\"node.transform\"\n        (click)=\"onClick(node)\"\n        (mousedown)=\"onNodeMouseDown($event, node)\"\n      >\n        <ng-container\n          *ngIf=\"nodeTemplate\"\n          [ngTemplateOutlet]=\"nodeTemplate\"\n          [ngTemplateOutletContext]=\"{ $implicit: node }\"\n        ></ng-container>\n        <svg:circle\n          *ngIf=\"!nodeTemplate\"\n          r=\"10\"\n          [attr.cx]=\"node.dimension.width / 2\"\n          [attr.cy]=\"node.dimension.height / 2\"\n          [attr.fill]=\"node.data?.color\"\n        />\n      </svg:g>\n    </svg:g>\n  </svg:g>\n\n  <svg:clipPath [attr.id]=\"minimapClipPathId\">\n    <svg:rect\n      [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n      [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n    ></svg:rect>\n  </svg:clipPath>\n\n  <svg:g\n    class=\"minimap\"\n    *ngIf=\"showMiniMap\"\n    [attr.transform]=\"minimapTransform\"\n    [attr.clip-path]=\"'url(#' + minimapClipPathId + ')'\"\n  >\n    <svg:rect\n      class=\"minimap-background\"\n      [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n      [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n      (mousedown)=\"onMinimapPanTo($event)\"\n    ></svg:rect>\n\n    <svg:g\n      [style.transform]=\"\n        'translate(' +\n        -minimapOffsetX / minimapScaleCoefficient +\n        'px,' +\n        -minimapOffsetY / minimapScaleCoefficient +\n        'px)'\n      \"\n    >\n      <svg:g class=\"minimap-nodes\" [style.transform]=\"'scale(' + 1 / minimapScaleCoefficient + ')'\">\n        <svg:g\n          #nodeElement\n          *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldNodes.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n        >\n          <ng-container\n            *ngIf=\"miniMapNodeTemplate\"\n            [ngTemplateOutlet]=\"miniMapNodeTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <ng-container\n            *ngIf=\"!miniMapNodeTemplate && nodeTemplate\"\n            [ngTemplateOutlet]=\"nodeTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:circle\n            *ngIf=\"!nodeTemplate && !miniMapNodeTemplate\"\n            r=\"10\"\n            [attr.cx]=\"node.dimension.width / 2 / minimapScaleCoefficient\"\n            [attr.cy]=\"node.dimension.height / 2 / minimapScaleCoefficient\"\n            [attr.fill]=\"node.data?.color\"\n          />\n        </svg:g>\n      </svg:g>\n\n      <svg:rect\n        [attr.transform]=\"\n          'translate(' +\n          panOffsetX / zoomLevel / -minimapScaleCoefficient +\n          ',' +\n          panOffsetY / zoomLevel / -minimapScaleCoefficient +\n          ')'\n        \"\n        class=\"minimap-drag\"\n        [class.panning]=\"isMinimapPanning\"\n        [attr.width]=\"width / minimapScaleCoefficient / zoomLevel\"\n        [attr.height]=\"height / minimapScaleCoefficient / zoomLevel\"\n        (mousedown)=\"onMinimapDragMouseDown()\"\n      ></svg:rect>\n    </svg:g>\n  </svg:g>\n</ngx-charts-chart>\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                styles: [".minimap .minimap-background{fill:rgba(0,0,0,.1)}.minimap .minimap-drag{cursor:pointer;fill:rgba(0,0,0,.2);stroke:#fff;stroke-dasharray:2px;stroke-dashoffset:2px;stroke-width:1px}.minimap .minimap-drag.panning{fill:rgba(0,0,0,.3)}.minimap .minimap-nodes{opacity:.5;pointer-events:none}.graph{-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none;user-select:none}.graph .edge{fill:none;stroke:#666}.graph .edge .edge-label{fill:#251e1e;font-size:12px;stroke:none}.graph .panning-rect{cursor:move;fill:transparent}.graph .node-group.old-node{transition:transform .5s ease-in-out}.graph .node-group .node:focus{outline:none}.graph .cluster rect{opacity:.2}"]
            },] }
];
GraphComponent.ctorParameters = () => [
    { type: ElementRef },
    { type: NgZone },
    { type: ChangeDetectorRef },
    { type: LayoutService }
];
GraphComponent.propDecorators = {
    legend: [{ type: Input }],
    nodes: [{ type: Input }],
    clusters: [{ type: Input }],
    links: [{ type: Input }],
    activeEntries: [{ type: Input }],
    curve: [{ type: Input }],
    draggingEnabled: [{ type: Input }],
    nodeHeight: [{ type: Input }],
    nodeMaxHeight: [{ type: Input }],
    nodeMinHeight: [{ type: Input }],
    nodeWidth: [{ type: Input }],
    nodeMinWidth: [{ type: Input }],
    nodeMaxWidth: [{ type: Input }],
    panningEnabled: [{ type: Input }],
    panningAxis: [{ type: Input }],
    enableZoom: [{ type: Input }],
    zoomSpeed: [{ type: Input }],
    minZoomLevel: [{ type: Input }],
    maxZoomLevel: [{ type: Input }],
    autoZoom: [{ type: Input }],
    panOnZoom: [{ type: Input }],
    animate: [{ type: Input }],
    autoCenter: [{ type: Input }],
    zoomToFitMargin: [{ type: Input }],
    update$: [{ type: Input }],
    center$: [{ type: Input }],
    zoomToFit$: [{ type: Input }],
    panToNode$: [{ type: Input }],
    layout: [{ type: Input }],
    layoutSettings: [{ type: Input }],
    enableTrackpadSupport: [{ type: Input }],
    showMiniMap: [{ type: Input }],
    miniMapMaxWidth: [{ type: Input }],
    miniMapMaxHeight: [{ type: Input }],
    miniMapPosition: [{ type: Input }],
    activate: [{ type: Output }],
    deactivate: [{ type: Output }],
    zoomChange: [{ type: Output }],
    clickHandler: [{ type: Output }],
    linkTemplate: [{ type: ContentChild, args: ['linkTemplate',] }],
    nodeTemplate: [{ type: ContentChild, args: ['nodeTemplate',] }],
    clusterTemplate: [{ type: ContentChild, args: ['clusterTemplate',] }],
    defsTemplate: [{ type: ContentChild, args: ['defsTemplate',] }],
    miniMapNodeTemplate: [{ type: ContentChild, args: ['miniMapNodeTemplate',] }],
    chart: [{ type: ViewChild, args: [ChartComponent, { read: ElementRef, static: true },] }],
    nodeElements: [{ type: ViewChildren, args: ['nodeElement',] }],
    linkElements: [{ type: ViewChildren, args: ['linkElement',] }],
    groupResultsBy: [{ type: Input }],
    zoomLevel: [{ type: Input, args: ['zoomLevel',] }],
    panOffsetX: [{ type: Input, args: ['panOffsetX',] }],
    panOffsetY: [{ type: Input, args: ['panOffsetY',] }],
    onMouseMove: [{ type: HostListener, args: ['document:mousemove', ['$event'],] }],
    onMouseDown: [{ type: HostListener, args: ['document:mousedown', ['$event'],] }],
    graphClick: [{ type: HostListener, args: ['document:click', ['$event'],] }],
    onTouchMove: [{ type: HostListener, args: ['document:touchmove', ['$event'],] }],
    onMouseUp: [{ type: HostListener, args: ['document:mouseup', ['$event'],] }]
};
__decorate([
    throttleable(500),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GraphComponent.prototype, "updateMinimap", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3dpbWxhbmUvbmd4LWdyYXBoL3NyYy9saWIvZ3JhcGgvZ3JhcGguY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFFQSxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxZQUFZLEVBQ1osVUFBVSxFQUNWLFlBQVksRUFDWixZQUFZLEVBQ1osS0FBSyxFQUdMLE1BQU0sRUFDTixTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFDVCxZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLE1BQU0sRUFDTixpQkFBaUIsRUFHbEIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUNMLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsV0FBVyxFQUVYLHVCQUF1QixFQUN4QixNQUFNLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxLQUFLLEtBQUssTUFBTSxVQUFVLENBQUM7QUFDbEMsT0FBTyxLQUFLLElBQUksTUFBTSxTQUFTLENBQUM7QUFDaEMsT0FBTyxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2QyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFJekQsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDcEQsT0FBTyxF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LFNBQUMsY0FBYztrQ0FDM0IsWUFBWSxTQUFDLHFCQUFxQjtvQkFFbEMsU0FBUyxTQUFDLGNBQWMsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTsyQkFDNUQsWUFBWSxTQUFDLGFBQWE7MkJBQzFCLFlBQVksU0FBQyxhQUFhOzZCQXlDMUIsS0FBSzt3QkFhTCxLQUFLLFNBQUMsV0FBVzt5QkFlakIsS0FBSyxTQUFDLFlBQVk7eUJBZWxCLEtBQUssU0FBQyxZQUFZOzBCQWl5QmxCLFlBQVksU0FBQyxvQkFBb0IsRUFBRSxDQUFDLFFBQVEsQ0FBQzswQkFVN0MsWUFBWSxTQUFDLG9CQUFvQixFQUFFLENBQUMsUUFBUSxDQUFDO3lCQUs3QyxZQUFZLFNBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUM7MEJBcUJ6QyxZQUFZLFNBQUMsb0JBQW9CLEVBQUUsQ0FBQyxRQUFRLENBQUM7d0JBNEI3QyxZQUFZLFNBQUMsa0JBQWtCLEVBQUUsQ0FBQyxRQUFRLENBQUM7O0FBL2U1QztJQURDLFlBQVksQ0FBQyxHQUFHLENBQUM7Ozs7bURBa0JqQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIHJlbmFtZSB0cmFuc2l0aW9uIGR1ZSB0byBjb25mbGljdCB3aXRoIGQzIHRyYW5zaXRpb25cbmltcG9ydCB7IGFuaW1hdGUsIHN0eWxlLCB0cmFuc2l0aW9uIGFzIG5nVHJhbnNpdGlvbiwgdHJpZ2dlciB9IGZyb20gJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnO1xuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgQ29udGVudENoaWxkLFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIEhvc3RMaXN0ZW5lcixcbiAgSW5wdXQsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFF1ZXJ5TGlzdCxcbiAgVGVtcGxhdGVSZWYsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0NoaWxkcmVuLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgTmdab25lLFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgT25DaGFuZ2VzLFxuICBTaW1wbGVDaGFuZ2VzXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtcbiAgQmFzZUNoYXJ0Q29tcG9uZW50LFxuICBDaGFydENvbXBvbmVudCxcbiAgQ29sb3JIZWxwZXIsXG4gIFZpZXdEaW1lbnNpb25zLFxuICBjYWxjdWxhdGVWaWV3RGltZW5zaW9uc1xufSBmcm9tICdAc3dpbWxhbmUvbmd4LWNoYXJ0cyc7XG5pbXBvcnQgeyBzZWxlY3QgfSBmcm9tICdkMy1zZWxlY3Rpb24nO1xuaW1wb3J0ICogYXMgc2hhcGUgZnJvbSAnZDMtc2hhcGUnO1xuaW1wb3J0ICogYXMgZWFzZSBmcm9tICdkMy1lYXNlJztcbmltcG9ydCAnZDMtdHJhbnNpdGlvbic7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaXJzdCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGlkZW50aXR5LCBzY2FsZSwgc21vb3RoTWF0cml4LCB0b1NWRywgdHJhbnNmb3JtLCB0cmFuc2xhdGUgfSBmcm9tICd0cmFuc2Zvcm1hdGlvbi1tYXRyaXgnO1xuaW1wb3J0IHsgTGF5b3V0IH0gZnJvbSAnLi4vbW9kZWxzL2xheW91dC5tb2RlbCc7XG5pbXBvcnQgeyBMYXlvdXRTZXJ2aWNlIH0gZnJvbSAnLi9sYXlvdXRzL2xheW91dC5zZXJ2aWNlJztcbmltcG9ydCB7IEVkZ2UgfSBmcm9tICcuLi9tb2RlbHMvZWRnZS5tb2RlbCc7XG5pbXBvcnQgeyBOb2RlLCBDbHVzdGVyTm9kZSB9IGZyb20gJy4uL21vZGVscy9ub2RlLm1vZGVsJztcbmltcG9ydCB7IEdyYXBoIH0gZnJvbSAnLi4vbW9kZWxzL2dyYXBoLm1vZGVsJztcbmltcG9ydCB7IGlkIH0gZnJvbSAnLi4vdXRpbHMvaWQnO1xuaW1wb3J0IHsgUGFubmluZ0F4aXMgfSBmcm9tICcuLi9lbnVtcy9wYW5uaW5nLmVudW0nO1xuaW1wb3J0IHsgTWluaU1hcFBvc2l0aW9uIH0gZnJvbSAnLi4vZW51bXMvbWluaS1tYXAtcG9zaXRpb24uZW51bSc7XG5pbXBvcnQgeyB0aHJvdHRsZWFibGUgfSBmcm9tICcuLi91dGlscy90aHJvdHRsZSc7XG5cbi8qKlxuICogTWF0cml4XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWF0cml4IHtcbiAgYTogbnVtYmVyO1xuICBiOiBudW1iZXI7XG4gIGM6IG51bWJlcjtcbiAgZDogbnVtYmVyO1xuICBlOiBudW1iZXI7XG4gIGY6IG51bWJlcjtcbn1cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbmd4LWdyYXBoJyxcbiAgc3R5bGVVcmxzOiBbJy4vZ3JhcGguY29tcG9uZW50LnNjc3MnXSxcbiAgdGVtcGxhdGVVcmw6ICdncmFwaC5jb21wb25lbnQuaHRtbCcsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoXG59KVxuZXhwb3J0IGNsYXNzIEdyYXBoQ29tcG9uZW50IGV4dGVuZHMgQmFzZUNoYXJ0Q29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgQWZ0ZXJWaWV3SW5pdCB7XG4gIEBJbnB1dCgpIGxlZ2VuZDogYm9vbGVhbiA9IGZhbHNlO1xuICBASW5wdXQoKSBub2RlczogTm9kZVtdID0gW107XG4gIEBJbnB1dCgpIGNsdXN0ZXJzOiBDbHVzdGVyTm9kZVtdID0gW107XG4gIEBJbnB1dCgpIGxpbmtzOiBFZGdlW10gPSBbXTtcbiAgQElucHV0KCkgYWN0aXZlRW50cmllczogYW55W10gPSBbXTtcbiAgQElucHV0KCkgY3VydmU6IGFueTtcbiAgQElucHV0KCkgZHJhZ2dpbmdFbmFibGVkID0gdHJ1ZTtcbiAgQElucHV0KCkgbm9kZUhlaWdodDogbnVtYmVyO1xuICBASW5wdXQoKSBub2RlTWF4SGVpZ2h0OiBudW1iZXI7XG4gIEBJbnB1dCgpIG5vZGVNaW5IZWlnaHQ6IG51bWJlcjtcbiAgQElucHV0KCkgbm9kZVdpZHRoOiBudW1iZXI7XG4gIEBJbnB1dCgpIG5vZGVNaW5XaWR0aDogbnVtYmVyO1xuICBASW5wdXQoKSBub2RlTWF4V2lkdGg6IG51bWJlcjtcbiAgQElucHV0KCkgcGFubmluZ0VuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuICBASW5wdXQoKSBwYW5uaW5nQXhpczogUGFubmluZ0F4aXMgPSBQYW5uaW5nQXhpcy5Cb3RoO1xuICBASW5wdXQoKSBlbmFibGVab29tID0gdHJ1ZTtcbiAgQElucHV0KCkgem9vbVNwZWVkID0gMC4xO1xuICBASW5wdXQoKSBtaW5ab29tTGV2ZWwgPSAwLjE7XG4gIEBJbnB1dCgpIG1heFpvb21MZXZlbCA9IDQuMDtcbiAgQElucHV0KCkgYXV0b1pvb20gPSBmYWxzZTtcbiAgQElucHV0KCkgcGFuT25ab29tID0gdHJ1ZTtcbiAgQElucHV0KCkgYW5pbWF0ZT8gPSBmYWxzZTtcbiAgQElucHV0KCkgYXV0b0NlbnRlciA9IGZhbHNlO1xuICAvKiogTWFyZ2luIGFwcGxpZWQgYXJvdW5kIHRoZSBkcmF3aW5nIGFyZWEgb24gem9vbSB0byBmaXQgKi9cbiAgQElucHV0KCkgem9vbVRvRml0TWFyZ2luOiB7eDogbnVtYmVyLCB5OiBudW1iZXJ9O1xuICBASW5wdXQoKSB1cGRhdGUkOiBPYnNlcnZhYmxlPGFueT47XG4gIEBJbnB1dCgpIGNlbnRlciQ6IE9ic2VydmFibGU8YW55PjtcbiAgQElucHV0KCkgem9vbVRvRml0JDogT2JzZXJ2YWJsZTxhbnk+O1xuICBASW5wdXQoKSBwYW5Ub05vZGUkOiBPYnNlcnZhYmxlPGFueT47XG4gIEBJbnB1dCgpIGxheW91dDogc3RyaW5nIHwgTGF5b3V0O1xuICBASW5wdXQoKSBsYXlvdXRTZXR0aW5nczogYW55O1xuICBASW5wdXQoKSBlbmFibGVUcmFja3BhZFN1cHBvcnQgPSBmYWxzZTtcbiAgQElucHV0KCkgc2hvd01pbmlNYXA6IGJvb2xlYW4gPSBmYWxzZTtcbiAgQElucHV0KCkgbWluaU1hcE1heFdpZHRoOiBudW1iZXIgPSAxMDA7XG4gIEBJbnB1dCgpIG1pbmlNYXBNYXhIZWlnaHQ6IG51bWJlcjtcbiAgQElucHV0KCkgbWluaU1hcFBvc2l0aW9uOiBNaW5pTWFwUG9zaXRpb24gPSBNaW5pTWFwUG9zaXRpb24uVXBwZXJSaWdodDtcblxuICBAT3V0cHV0KCkgYWN0aXZhdGU6IEV2ZW50RW1pdHRlcjxhbnk+ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZGVhY3RpdmF0ZTogRXZlbnRFbWl0dGVyPGFueT4gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSB6b29tQ2hhbmdlOiBFdmVudEVtaXR0ZXI8bnVtYmVyPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGNsaWNrSGFuZGxlcjogRXZlbnRFbWl0dGVyPE1vdXNlRXZlbnQ+ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIEBDb250ZW50Q2hpbGQoJ2xpbmtUZW1wbGF0ZScpIGxpbmtUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZCgnbm9kZVRlbXBsYXRlJykgbm9kZVRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICBAQ29udGVudENoaWxkKCdjbHVzdGVyVGVtcGxhdGUnKSBjbHVzdGVyVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoJ2RlZnNUZW1wbGF0ZScpIGRlZnNUZW1wbGF0ZTogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZCgnbWluaU1hcE5vZGVUZW1wbGF0ZScpIG1pbmlNYXBOb2RlVGVtcGxhdGU6IFRlbXBsYXRlUmVmPGFueT47XG5cbiAgQFZpZXdDaGlsZChDaGFydENvbXBvbmVudCwgeyByZWFkOiBFbGVtZW50UmVmLCBzdGF0aWM6IHRydWUgfSkgY2hhcnQ6IEVsZW1lbnRSZWY7XG4gIEBWaWV3Q2hpbGRyZW4oJ25vZGVFbGVtZW50Jykgbm9kZUVsZW1lbnRzOiBRdWVyeUxpc3Q8RWxlbWVudFJlZj47XG4gIEBWaWV3Q2hpbGRyZW4oJ2xpbmtFbGVtZW50JykgbGlua0VsZW1lbnRzOiBRdWVyeUxpc3Q8RWxlbWVudFJlZj47XG5cbiAgcHJpdmF0ZSBpc01vdXNlTW92ZUNhbGxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGdyYXBoU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKCk7XG4gIHN1YnNjcmlwdGlvbnM6IFN1YnNjcmlwdGlvbltdID0gW107XG4gIGNvbG9yczogQ29sb3JIZWxwZXI7XG4gIGRpbXM6IFZpZXdEaW1lbnNpb25zO1xuICBtYXJnaW4gPSBbMCwgMCwgMCwgMF07XG4gIHJlc3VsdHMgPSBbXTtcbiAgc2VyaWVzRG9tYWluOiBhbnk7XG4gIHRyYW5zZm9ybTogc3RyaW5nO1xuICBsZWdlbmRPcHRpb25zOiBhbnk7XG4gIGlzUGFubmluZyA9IGZhbHNlO1xuICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gIGRyYWdnaW5nTm9kZTogTm9kZTtcbiAgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgZ3JhcGg6IEdyYXBoO1xuICBncmFwaERpbXM6IGFueSA9IHsgd2lkdGg6IDAsIGhlaWdodDogMCB9O1xuICBfb2xkTGlua3M6IEVkZ2VbXSA9IFtdO1xuICBvbGROb2RlczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG4gIG9sZENsdXN0ZXJzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcbiAgdHJhbnNmb3JtYXRpb25NYXRyaXg6IE1hdHJpeCA9IGlkZW50aXR5KCk7XG4gIF90b3VjaExhc3RYID0gbnVsbDtcbiAgX3RvdWNoTGFzdFkgPSBudWxsO1xuICBtaW5pbWFwU2NhbGVDb2VmZmljaWVudDogbnVtYmVyID0gMztcbiAgbWluaW1hcFRyYW5zZm9ybTogc3RyaW5nO1xuICBtaW5pbWFwT2Zmc2V0WDogbnVtYmVyID0gMDtcbiAgbWluaW1hcE9mZnNldFk6IG51bWJlciA9IDA7XG4gIGlzTWluaW1hcFBhbm5pbmcgPSBmYWxzZTtcbiAgbWluaW1hcENsaXBQYXRoSWQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGVsOiBFbGVtZW50UmVmLFxuICAgIHB1YmxpYyB6b25lOiBOZ1pvbmUsXG4gICAgcHVibGljIGNkOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICBwcml2YXRlIGxheW91dFNlcnZpY2U6IExheW91dFNlcnZpY2VcbiAgKSB7XG4gICAgc3VwZXIoZWwsIHpvbmUsIGNkKTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIGdyb3VwUmVzdWx0c0J5OiAobm9kZTogYW55KSA9PiBzdHJpbmcgPSBub2RlID0+IG5vZGUubGFiZWw7XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCB6b29tIGxldmVsXG4gICAqL1xuICBnZXQgem9vbUxldmVsKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4LmE7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBjdXJyZW50IHpvb20gbGV2ZWxcbiAgICovXG4gIEBJbnB1dCgnem9vbUxldmVsJylcbiAgc2V0IHpvb21MZXZlbChsZXZlbCkge1xuICAgIHRoaXMuem9vbVRvKE51bWJlcihsZXZlbCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCBgeGAgcG9zaXRpb24gb2YgdGhlIGdyYXBoXG4gICAqL1xuICBnZXQgcGFuT2Zmc2V0WCgpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5lO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgY3VycmVudCBgeGAgcG9zaXRpb24gb2YgdGhlIGdyYXBoXG4gICAqL1xuICBASW5wdXQoJ3Bhbk9mZnNldFgnKVxuICBzZXQgcGFuT2Zmc2V0WCh4KSB7XG4gICAgdGhpcy5wYW5UbyhOdW1iZXIoeCksIG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCBgeWAgcG9zaXRpb24gb2YgdGhlIGdyYXBoXG4gICAqL1xuICBnZXQgcGFuT2Zmc2V0WSgpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5mO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgY3VycmVudCBgeWAgcG9zaXRpb24gb2YgdGhlIGdyYXBoXG4gICAqL1xuICBASW5wdXQoJ3Bhbk9mZnNldFknKVxuICBzZXQgcGFuT2Zmc2V0WSh5KSB7XG4gICAgdGhpcy5wYW5UbyhudWxsLCBOdW1iZXIoeSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuZ3VsYXIgbGlmZWN5Y2xlIGV2ZW50XG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudXBkYXRlJCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICAgIHRoaXMudXBkYXRlJC5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNlbnRlciQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICB0aGlzLmNlbnRlciQuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmNlbnRlcigpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuem9vbVRvRml0JCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICAgIHRoaXMuem9vbVRvRml0JC5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuem9vbVRvRml0KCk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBhblRvTm9kZSQpIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICB0aGlzLnBhblRvTm9kZSQuc3Vic2NyaWJlKChub2RlSWQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgIHRoaXMucGFuVG9Ob2RlSWQobm9kZUlkKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGhpcy5taW5pbWFwQ2xpcFBhdGhJZCA9IGBtaW5pbWFwQ2xpcCR7aWQoKX1gO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGNvbnN0IHsgbGF5b3V0LCBsYXlvdXRTZXR0aW5ncywgbm9kZXMsIGNsdXN0ZXJzLCBsaW5rcyB9ID0gY2hhbmdlcztcbiAgICB0aGlzLnNldExheW91dCh0aGlzLmxheW91dCk7XG4gICAgaWYgKGxheW91dFNldHRpbmdzKSB7XG4gICAgICB0aGlzLnNldExheW91dFNldHRpbmdzKHRoaXMubGF5b3V0U2V0dGluZ3MpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG5cbiAgc2V0TGF5b3V0KGxheW91dDogc3RyaW5nIHwgTGF5b3V0KTogdm9pZCB7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIGlmICghbGF5b3V0KSB7XG4gICAgICBsYXlvdXQgPSAnZGFncmUnO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGxheW91dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubGF5b3V0ID0gdGhpcy5sYXlvdXRTZXJ2aWNlLmdldExheW91dChsYXlvdXQpO1xuICAgICAgdGhpcy5zZXRMYXlvdXRTZXR0aW5ncyh0aGlzLmxheW91dFNldHRpbmdzKTtcbiAgICB9XG4gIH1cblxuICBzZXRMYXlvdXRTZXR0aW5ncyhzZXR0aW5nczogYW55KTogdm9pZCB7XG4gICAgaWYgKHRoaXMubGF5b3V0ICYmIHR5cGVvZiB0aGlzLmxheW91dCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMubGF5b3V0LnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFuZ3VsYXIgbGlmZWN5Y2xlIGV2ZW50XG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgc3VwZXIubmdPbkRlc3Ryb3koKTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnN1YnNjcmlwdGlvbnMpIHtcbiAgICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuZ3VsYXIgbGlmZWN5Y2xlIGV2ZW50XG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgbmdBZnRlclZpZXdJbml0KCk6IHZvaWQge1xuICAgIHN1cGVyLm5nQWZ0ZXJWaWV3SW5pdCgpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy51cGRhdGUoKSk7XG4gIH1cblxuICAvKipcbiAgICogQmFzZSBjbGFzcyB1cGRhdGUgaW1wbGVtZW50YXRpb24gZm9yIHRoZSBkYWcgZ3JhcGhcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICB1cGRhdGUoKTogdm9pZCB7XG4gICAgc3VwZXIudXBkYXRlKCk7XG4gICAgaWYgKCF0aGlzLmN1cnZlKSB7XG4gICAgICB0aGlzLmN1cnZlID0gc2hhcGUuY3VydmVCdW5kbGUuYmV0YSgxKTtcbiAgICB9XG5cbiAgICB0aGlzLnpvbmUucnVuKCgpID0+IHtcbiAgICAgIHRoaXMuZGltcyA9IGNhbGN1bGF0ZVZpZXdEaW1lbnNpb25zKHtcbiAgICAgICAgd2lkdGg6IHRoaXMud2lkdGgsXG4gICAgICAgIGhlaWdodDogdGhpcy5oZWlnaHQsXG4gICAgICAgIG1hcmdpbnM6IHRoaXMubWFyZ2luLFxuICAgICAgICBzaG93TGVnZW5kOiB0aGlzLmxlZ2VuZFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc2VyaWVzRG9tYWluID0gdGhpcy5nZXRTZXJpZXNEb21haW4oKTtcbiAgICAgIHRoaXMuc2V0Q29sb3JzKCk7XG4gICAgICB0aGlzLmxlZ2VuZE9wdGlvbnMgPSB0aGlzLmdldExlZ2VuZE9wdGlvbnMoKTtcblxuICAgICAgdGhpcy5jcmVhdGVHcmFwaCgpO1xuICAgICAgdGhpcy51cGRhdGVUcmFuc2Zvcm0oKTtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIGRhZ3JlIGdyYXBoIGVuZ2luZVxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIGNyZWF0ZUdyYXBoKCk6IHZvaWQge1xuICAgIHRoaXMuZ3JhcGhTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLmdyYXBoU3Vic2NyaXB0aW9uID0gbmV3IFN1YnNjcmlwdGlvbigpO1xuICAgIGNvbnN0IGluaXRpYWxpemVOb2RlID0gKG46IE5vZGUpID0+IHtcbiAgICAgIGlmICghbi5tZXRhKSB7XG4gICAgICAgIG4ubWV0YSA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKCFuLmlkKSB7XG4gICAgICAgIG4uaWQgPSBpZCgpO1xuICAgICAgfVxuICAgICAgaWYgKCFuLmRpbWVuc2lvbikge1xuICAgICAgICBuLmRpbWVuc2lvbiA9IHtcbiAgICAgICAgICB3aWR0aDogdGhpcy5ub2RlV2lkdGggPyB0aGlzLm5vZGVXaWR0aCA6IDMwLFxuICAgICAgICAgIGhlaWdodDogdGhpcy5ub2RlSGVpZ2h0ID8gdGhpcy5ub2RlSGVpZ2h0IDogMzBcbiAgICAgICAgfTtcbiAgICAgICAgbi5tZXRhLmZvcmNlRGltZW5zaW9ucyA9IGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbi5tZXRhLmZvcmNlRGltZW5zaW9ucyA9IG4ubWV0YS5mb3JjZURpbWVuc2lvbnMgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBuLm1ldGEuZm9yY2VEaW1lbnNpb25zO1xuICAgICAgfVxuICAgICAgbi5wb3NpdGlvbiA9IHtcbiAgICAgICAgeDogMCxcbiAgICAgICAgeTogMFxuICAgICAgfTtcbiAgICAgIG4uZGF0YSA9IG4uZGF0YSA/IG4uZGF0YSA6IHt9O1xuICAgICAgcmV0dXJuIG47XG4gICAgfTtcblxuICAgIHRoaXMuZ3JhcGggPSB7XG4gICAgICBub2RlczogdGhpcy5ub2Rlcy5sZW5ndGggPiAwID8gWy4uLnRoaXMubm9kZXNdLm1hcChpbml0aWFsaXplTm9kZSkgOiBbXSxcbiAgICAgIGNsdXN0ZXJzOiB0aGlzLmNsdXN0ZXJzICYmIHRoaXMuY2x1c3RlcnMubGVuZ3RoID4gMCA/IFsuLi50aGlzLmNsdXN0ZXJzXS5tYXAoaW5pdGlhbGl6ZU5vZGUpIDogW10sXG4gICAgICBlZGdlczpcbiAgICAgICAgdGhpcy5saW5rcy5sZW5ndGggPiAwXG4gICAgICAgICAgPyBbLi4udGhpcy5saW5rc10ubWFwKGUgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWUuaWQpIHtcbiAgICAgICAgICAgICAgICBlLmlkID0gaWQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgOiBbXVxuICAgIH07XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gdGhpcy5kcmF3KCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERyYXdzIHRoZSBncmFwaCB1c2luZyBkYWdyZSBsYXlvdXRzXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgZHJhdygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubGF5b3V0IHx8IHR5cGVvZiB0aGlzLmxheW91dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gQ2FsYyB2aWV3IGRpbXMgZm9yIHRoZSBub2Rlc1xuICAgIHRoaXMuYXBwbHlOb2RlRGltZW5zaW9ucygpO1xuXG4gICAgLy8gUmVjYWxjIHRoZSBsYXlvdXRcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmxheW91dC5ydW4odGhpcy5ncmFwaCk7XG4gICAgY29uc3QgcmVzdWx0JCA9IHJlc3VsdCBpbnN0YW5jZW9mIE9ic2VydmFibGUgPyByZXN1bHQgOiBvZihyZXN1bHQpO1xuICAgIHRoaXMuZ3JhcGhTdWJzY3JpcHRpb24uYWRkKFxuICAgICAgcmVzdWx0JC5zdWJzY3JpYmUoZ3JhcGggPT4ge1xuICAgICAgICB0aGlzLmdyYXBoID0gZ3JhcGg7XG4gICAgICAgIHRoaXMudGljaygpO1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuZ3JhcGgubm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVzdWx0JC5waXBlKGZpcnN0KCkpLnN1YnNjcmliZSgoKSA9PiB0aGlzLmFwcGx5Tm9kZURpbWVuc2lvbnMoKSk7XG4gIH1cblxuICB0aWNrKCkge1xuICAgIC8vIFRyYW5zcG9zZXMgdmlldyBvcHRpb25zIHRvIHRoZSBub2RlXG4gICAgY29uc3Qgb2xkTm9kZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuXG4gICAgdGhpcy5ncmFwaC5ub2Rlcy5tYXAobiA9PiB7XG4gICAgICBuLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtuLnBvc2l0aW9uLnggLSBuLmRpbWVuc2lvbi53aWR0aCAvIDIgfHwgMH0sICR7XG4gICAgICAgIG4ucG9zaXRpb24ueSAtIG4uZGltZW5zaW9uLmhlaWdodCAvIDIgfHwgMFxuICAgICAgfSlgO1xuICAgICAgaWYgKCFuLmRhdGEpIHtcbiAgICAgICAgbi5kYXRhID0ge307XG4gICAgICB9XG4gICAgICBuLmRhdGEuY29sb3IgPSB0aGlzLmNvbG9ycy5nZXRDb2xvcih0aGlzLmdyb3VwUmVzdWx0c0J5KG4pKTtcbiAgICAgIG9sZE5vZGVzLmFkZChuLmlkKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG9sZENsdXN0ZXJzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcblxuICAgICh0aGlzLmdyYXBoLmNsdXN0ZXJzIHx8IFtdKS5tYXAobiA9PiB7XG4gICAgICBuLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtuLnBvc2l0aW9uLnggLSBuLmRpbWVuc2lvbi53aWR0aCAvIDIgfHwgMH0sICR7XG4gICAgICAgIG4ucG9zaXRpb24ueSAtIG4uZGltZW5zaW9uLmhlaWdodCAvIDIgfHwgMFxuICAgICAgfSlgO1xuICAgICAgaWYgKCFuLmRhdGEpIHtcbiAgICAgICAgbi5kYXRhID0ge307XG4gICAgICB9XG4gICAgICBuLmRhdGEuY29sb3IgPSB0aGlzLmNvbG9ycy5nZXRDb2xvcih0aGlzLmdyb3VwUmVzdWx0c0J5KG4pKTtcbiAgICAgIG9sZENsdXN0ZXJzLmFkZChuLmlkKTtcbiAgICB9KTtcblxuICAgIC8vIFByZXZlbnQgYW5pbWF0aW9ucyBvbiBuZXcgbm9kZXNcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMub2xkTm9kZXMgPSBvbGROb2RlcztcbiAgICAgIHRoaXMub2xkQ2x1c3RlcnMgPSBvbGRDbHVzdGVycztcbiAgICB9LCA1MDApO1xuXG4gICAgLy8gVXBkYXRlIHRoZSBsYWJlbHMgdG8gdGhlIG5ldyBwb3NpdGlvbnNcbiAgICBjb25zdCBuZXdMaW5rcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZWRnZUxhYmVsSWQgaW4gdGhpcy5ncmFwaC5lZGdlTGFiZWxzKSB7XG4gICAgICBjb25zdCBlZGdlTGFiZWwgPSB0aGlzLmdyYXBoLmVkZ2VMYWJlbHNbZWRnZUxhYmVsSWRdO1xuXG4gICAgICBjb25zdCBub3JtS2V5ID0gZWRnZUxhYmVsSWQucmVwbGFjZSgvW15cXHctXSovZywgJycpO1xuXG4gICAgICBjb25zdCBpc011bHRpZ3JhcGggPVxuICAgICAgICB0aGlzLmxheW91dCAmJiB0eXBlb2YgdGhpcy5sYXlvdXQgIT09ICdzdHJpbmcnICYmIHRoaXMubGF5b3V0LnNldHRpbmdzICYmIHRoaXMubGF5b3V0LnNldHRpbmdzLm11bHRpZ3JhcGg7XG5cbiAgICAgIGxldCBvbGRMaW5rID0gaXNNdWx0aWdyYXBoXG4gICAgICAgID8gdGhpcy5fb2xkTGlua3MuZmluZChvbCA9PiBgJHtvbC5zb3VyY2V9JHtvbC50YXJnZXR9JHtvbC5pZH1gID09PSBub3JtS2V5KVxuICAgICAgICA6IHRoaXMuX29sZExpbmtzLmZpbmQob2wgPT4gYCR7b2wuc291cmNlfSR7b2wudGFyZ2V0fWAgPT09IG5vcm1LZXkpO1xuXG4gICAgICBjb25zdCBsaW5rRnJvbUdyYXBoID0gaXNNdWx0aWdyYXBoXG4gICAgICAgID8gdGhpcy5ncmFwaC5lZGdlcy5maW5kKG5sID0+IGAke25sLnNvdXJjZX0ke25sLnRhcmdldH0ke25sLmlkfWAgPT09IG5vcm1LZXkpXG4gICAgICAgIDogdGhpcy5ncmFwaC5lZGdlcy5maW5kKG5sID0+IGAke25sLnNvdXJjZX0ke25sLnRhcmdldH1gID09PSBub3JtS2V5KTtcblxuICAgICAgaWYgKCFvbGRMaW5rKSB7XG4gICAgICAgIG9sZExpbmsgPSBsaW5rRnJvbUdyYXBoIHx8IGVkZ2VMYWJlbDtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIG9sZExpbmsuZGF0YSAmJlxuICAgICAgICBsaW5rRnJvbUdyYXBoICYmXG4gICAgICAgIGxpbmtGcm9tR3JhcGguZGF0YSAmJlxuICAgICAgICBKU09OLnN0cmluZ2lmeShvbGRMaW5rLmRhdGEpICE9PSBKU09OLnN0cmluZ2lmeShsaW5rRnJvbUdyYXBoLmRhdGEpXG4gICAgICApIHtcbiAgICAgICAgLy8gQ29tcGFyZSBvbGQgbGluayB0byBuZXcgbGluayBhbmQgcmVwbGFjZSBpZiBub3QgZXF1YWxcbiAgICAgICAgb2xkTGluay5kYXRhID0gbGlua0Zyb21HcmFwaC5kYXRhO1xuICAgICAgfVxuXG4gICAgICBvbGRMaW5rLm9sZExpbmUgPSBvbGRMaW5rLmxpbmU7XG5cbiAgICAgIGNvbnN0IHBvaW50cyA9IGVkZ2VMYWJlbC5wb2ludHM7XG4gICAgICBjb25zdCBsaW5lID0gdGhpcy5nZW5lcmF0ZUxpbmUocG9pbnRzKTtcblxuICAgICAgY29uc3QgbmV3TGluayA9IE9iamVjdC5hc3NpZ24oe30sIG9sZExpbmspO1xuICAgICAgbmV3TGluay5saW5lID0gbGluZTtcbiAgICAgIG5ld0xpbmsucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgICB0aGlzLnVwZGF0ZU1pZHBvaW50T25FZGdlKG5ld0xpbmssIHBvaW50cyk7XG5cbiAgICAgIGNvbnN0IHRleHRQb3MgPSBwb2ludHNbTWF0aC5mbG9vcihwb2ludHMubGVuZ3RoIC8gMildO1xuICAgICAgaWYgKHRleHRQb3MpIHtcbiAgICAgICAgbmV3TGluay50ZXh0VHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke3RleHRQb3MueCB8fCAwfSwke3RleHRQb3MueSB8fCAwfSlgO1xuICAgICAgfVxuXG4gICAgICBuZXdMaW5rLnRleHRBbmdsZSA9IDA7XG4gICAgICBpZiAoIW5ld0xpbmsub2xkTGluZSkge1xuICAgICAgICBuZXdMaW5rLm9sZExpbmUgPSBuZXdMaW5rLmxpbmU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2FsY0RvbWluYW50QmFzZWxpbmUobmV3TGluayk7XG4gICAgICBuZXdMaW5rcy5wdXNoKG5ld0xpbmspO1xuICAgIH1cblxuICAgIHRoaXMuZ3JhcGguZWRnZXMgPSBuZXdMaW5rcztcblxuICAgIC8vIE1hcCB0aGUgb2xkIGxpbmtzIGZvciBhbmltYXRpb25zXG4gICAgaWYgKHRoaXMuZ3JhcGguZWRnZXMpIHtcbiAgICAgIHRoaXMuX29sZExpbmtzID0gdGhpcy5ncmFwaC5lZGdlcy5tYXAobCA9PiB7XG4gICAgICAgIGNvbnN0IG5ld0wgPSBPYmplY3QuYXNzaWduKHt9LCBsKTtcbiAgICAgICAgbmV3TC5vbGRMaW5lID0gbC5saW5lO1xuICAgICAgICByZXR1cm4gbmV3TDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlTWluaW1hcCgpO1xuXG4gICAgaWYgKHRoaXMuYXV0b1pvb20pIHtcbiAgICAgIHRoaXMuem9vbVRvRml0KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYXV0b0NlbnRlcikge1xuICAgICAgLy8gQXV0by1jZW50ZXIgd2hlbiByZW5kZXJpbmdcbiAgICAgIHRoaXMuY2VudGVyKCk7XG4gICAgfVxuXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHRoaXMucmVkcmF3TGluZXMoKSk7XG4gICAgdGhpcy5jZC5tYXJrRm9yQ2hlY2soKTtcbiAgfVxuXG4gIGdldE1pbmltYXBUcmFuc2Zvcm0oKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHRoaXMubWluaU1hcFBvc2l0aW9uKSB7XG4gICAgICBjYXNlIE1pbmlNYXBQb3NpdGlvbi5VcHBlckxlZnQ6IHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgICAgY2FzZSBNaW5pTWFwUG9zaXRpb24uVXBwZXJSaWdodDoge1xuICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgKHRoaXMuZGltcy53aWR0aCAtIHRoaXMuZ3JhcGhEaW1zLndpZHRoIC8gdGhpcy5taW5pbWFwU2NhbGVDb2VmZmljaWVudCkgKyAnLCcgKyAwICsgJyknO1xuICAgICAgfVxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdXBkYXRlR3JhcGhEaW1zKCkge1xuICAgIGxldCBtaW5YID0gK0luZmluaXR5O1xuICAgIGxldCBtYXhYID0gLUluZmluaXR5O1xuICAgIGxldCBtaW5ZID0gK0luZmluaXR5O1xuICAgIGxldCBtYXhZID0gLUluZmluaXR5O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmdyYXBoLm5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBub2RlID0gdGhpcy5ncmFwaC5ub2Rlc1tpXTtcbiAgICAgIG1pblggPSBub2RlLnBvc2l0aW9uLnggPCBtaW5YID8gbm9kZS5wb3NpdGlvbi54IDogbWluWDtcbiAgICAgIG1pblkgPSBub2RlLnBvc2l0aW9uLnkgPCBtaW5ZID8gbm9kZS5wb3NpdGlvbi55IDogbWluWTtcbiAgICAgIG1heFggPSBub2RlLnBvc2l0aW9uLnggKyBub2RlLmRpbWVuc2lvbi53aWR0aCA+IG1heFggPyBub2RlLnBvc2l0aW9uLnggKyBub2RlLmRpbWVuc2lvbi53aWR0aCA6IG1heFg7XG4gICAgICBtYXhZID0gbm9kZS5wb3NpdGlvbi55ICsgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ID4gbWF4WSA/IG5vZGUucG9zaXRpb24ueSArIG5vZGUuZGltZW5zaW9uLmhlaWdodCA6IG1heFk7XG4gICAgfVxuXG4gICAgLy8gV2hlbiBjbHVzdGVycyBhcmUgcHJlc2VudCwgbGVhdmUgcm9vbSBhcm91bmQgdGhlIGdyYXBoXG4gICAgLy8gdG8gYWNjb3VudCBmb3IgaGVpZ2h0IGFuZCB3aWR0aCB0aGV5IGNhbiBhZGQgdG8gdGhlIGRpbWVuc2lvbnMuXG4gICAgLy8gSXRlcmF0aW5nIHRocm91Z2ggdGhlIGdyYXBoIGNsdXN0ZXJzIGFuZCBtaW4vbWF4aW5nXG4gICAgLy8gdGhlaXIgcG9zaXRpb24gYW5kIGRpbWVuc2lvbiBkaWRuJ3Qgd29yay5cbiAgICAvLyBUaGUgZ3JhcGggY2FsY3VsYXRlZCBzaXplIHdhcyBzdGlsbCB0b28gbG93IGFuZCBzb21lIG5vZGVzXG4gICAgLy8gd2VyZSByZW5kZXJlZCBvdXRzaWRlIG9mIHRoZSB2aWV3IHdoZW4gdXNpbmcgem9vbVRvRml0LlxuICAgIC8vIFdpdGhvdXQgY2x1c3RlcnMsIHVzaW5nIGRhZ3JlLCB0aGUgZXh0cmEgc3BhY2luZyBhbGwgYXJvdW5kXG4gICAgLy8gY2F1c2VzIHRoZSBncmFwaCB0byBiZSBzaGlmdGVkIHVwL2xlZnQgaW5zdGVhZCBvZiBiZWluZyBjZW50ZXJlZC5cbiAgICBpZiAodGhpcy5ncmFwaC5jbHVzdGVycy5sZW5ndGggPiAwKSB7XG4gICAgICBtaW5YIC09IDEwMDtcbiAgICAgIG1pblkgLT0gMTAwO1xuICAgICAgbWF4WCArPSAxMDA7XG4gICAgICBtYXhZICs9IDEwMDtcbiAgICB9XG5cbiAgICB0aGlzLmdyYXBoRGltcy53aWR0aCA9IG1heFggLSBtaW5YO1xuICAgIHRoaXMuZ3JhcGhEaW1zLmhlaWdodCA9IG1heFkgLSBtaW5ZO1xuICAgIHRoaXMubWluaW1hcE9mZnNldFggPSBtaW5YO1xuICAgIHRoaXMubWluaW1hcE9mZnNldFkgPSBtaW5ZO1xuICB9XG5cbiAgQHRocm90dGxlYWJsZSg1MDApXG4gIHVwZGF0ZU1pbmltYXAoKSB7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBoZWlnaHQvd2lkdGggdG90YWwsIGJ1dCBvbmx5IGlmIHdlIGhhdmUgYW55IG5vZGVzXG4gICAgaWYgKHRoaXMuZ3JhcGgubm9kZXMgJiYgdGhpcy5ncmFwaC5ub2Rlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMudXBkYXRlR3JhcGhEaW1zKCk7XG5cbiAgICAgIGlmICh0aGlzLm1pbmlNYXBNYXhXaWR0aCkge1xuICAgICAgICB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50ID0gdGhpcy5ncmFwaERpbXMud2lkdGggLyB0aGlzLm1pbmlNYXBNYXhXaWR0aDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm1pbmlNYXBNYXhIZWlnaHQpIHtcbiAgICAgICAgdGhpcy5taW5pbWFwU2NhbGVDb2VmZmljaWVudCA9IE1hdGgubWF4KFxuICAgICAgICAgIHRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQsXG4gICAgICAgICAgdGhpcy5ncmFwaERpbXMuaGVpZ2h0IC8gdGhpcy5taW5pTWFwTWF4SGVpZ2h0XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubWluaW1hcFRyYW5zZm9ybSA9IHRoaXMuZ2V0TWluaW1hcFRyYW5zZm9ybSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZWFzdXJlcyB0aGUgbm9kZSBlbGVtZW50IGFuZCBhcHBsaWVzIHRoZSBkaW1lbnNpb25zXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgYXBwbHlOb2RlRGltZW5zaW9ucygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5ub2RlRWxlbWVudHMgJiYgdGhpcy5ub2RlRWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLm5vZGVFbGVtZW50cy5tYXAoZWxlbSA9PiB7XG4gICAgICAgIGNvbnN0IG5hdGl2ZUVsZW1lbnQgPSBlbGVtLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdyYXBoLm5vZGVzLmZpbmQobiA9PiBuLmlkID09PSBuYXRpdmVFbGVtZW50LmlkKTtcbiAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSBoZWlnaHRcbiAgICAgICAgbGV0IGRpbXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZGltcyA9IG5hdGl2ZUVsZW1lbnQuZ2V0QkJveCgpO1xuICAgICAgICAgIGlmICghZGltcy53aWR0aCB8fCAhZGltcy5oZWlnaHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgLy8gU2tpcCBkcmF3aW5nIGlmIGVsZW1lbnQgaXMgbm90IGRpc3BsYXllZCAtIEZpcmVmb3ggd291bGQgdGhyb3cgYW4gZXJyb3IgaGVyZVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlSGVpZ2h0KSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ID1cbiAgICAgICAgICAgIG5vZGUuZGltZW5zaW9uLmhlaWdodCAmJiBub2RlLm1ldGEuZm9yY2VEaW1lbnNpb25zID8gbm9kZS5kaW1lbnNpb24uaGVpZ2h0IDogdGhpcy5ub2RlSGVpZ2h0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5vZGUuZGltZW5zaW9uLmhlaWdodCA9XG4gICAgICAgICAgICBub2RlLmRpbWVuc2lvbi5oZWlnaHQgJiYgbm9kZS5tZXRhLmZvcmNlRGltZW5zaW9ucyA/IG5vZGUuZGltZW5zaW9uLmhlaWdodCA6IGRpbXMuaGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZU1heEhlaWdodCkge1xuICAgICAgICAgIG5vZGUuZGltZW5zaW9uLmhlaWdodCA9IE1hdGgubWF4KG5vZGUuZGltZW5zaW9uLmhlaWdodCwgdGhpcy5ub2RlTWF4SGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlTWluSGVpZ2h0KSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24uaGVpZ2h0ID0gTWF0aC5taW4obm9kZS5kaW1lbnNpb24uaGVpZ2h0LCB0aGlzLm5vZGVNaW5IZWlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZVdpZHRoKSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggPVxuICAgICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggJiYgbm9kZS5tZXRhLmZvcmNlRGltZW5zaW9ucyA/IG5vZGUuZGltZW5zaW9uLndpZHRoIDogdGhpcy5ub2RlV2lkdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSB3aWR0aFxuICAgICAgICAgIGlmIChuYXRpdmVFbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0ZXh0JykubGVuZ3RoKSB7XG4gICAgICAgICAgICBsZXQgbWF4VGV4dERpbXM7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRleHRFbGVtIG9mIG5hdGl2ZUVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RleHQnKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRCQm94ID0gdGV4dEVsZW0uZ2V0QkJveCgpO1xuICAgICAgICAgICAgICAgIGlmICghbWF4VGV4dERpbXMpIHtcbiAgICAgICAgICAgICAgICAgIG1heFRleHREaW1zID0gY3VycmVudEJCb3g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QkJveC53aWR0aCA+IG1heFRleHREaW1zLndpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heFRleHREaW1zLndpZHRoID0gY3VycmVudEJCb3gud2lkdGg7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoY3VycmVudEJCb3guaGVpZ2h0ID4gbWF4VGV4dERpbXMuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgICAgIG1heFRleHREaW1zLmhlaWdodCA9IGN1cnJlbnRCQm94LmhlaWdodDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICAgIC8vIFNraXAgZHJhd2luZyBpZiBlbGVtZW50IGlzIG5vdCBkaXNwbGF5ZWQgLSBGaXJlZm94IHdvdWxkIHRocm93IGFuIGVycm9yIGhlcmVcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggPVxuICAgICAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCAmJiBub2RlLm1ldGEuZm9yY2VEaW1lbnNpb25zID8gbm9kZS5kaW1lbnNpb24ud2lkdGggOiBtYXhUZXh0RGltcy53aWR0aCArIDIwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlLmRpbWVuc2lvbi53aWR0aCA9XG4gICAgICAgICAgICAgIG5vZGUuZGltZW5zaW9uLndpZHRoICYmIG5vZGUubWV0YS5mb3JjZURpbWVuc2lvbnMgPyBub2RlLmRpbWVuc2lvbi53aWR0aCA6IGRpbXMud2lkdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZU1heFdpZHRoKSB7XG4gICAgICAgICAgbm9kZS5kaW1lbnNpb24ud2lkdGggPSBNYXRoLm1heChub2RlLmRpbWVuc2lvbi53aWR0aCwgdGhpcy5ub2RlTWF4V2lkdGgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGVNaW5XaWR0aCkge1xuICAgICAgICAgIG5vZGUuZGltZW5zaW9uLndpZHRoID0gTWF0aC5taW4obm9kZS5kaW1lbnNpb24ud2lkdGgsIHRoaXMubm9kZU1pbldpZHRoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlZHJhd3MgdGhlIGxpbmVzIHdoZW4gZHJhZ2dlZCBvciB2aWV3cG9ydCB1cGRhdGVkXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgcmVkcmF3TGluZXMoX2FuaW1hdGUgPSB0aGlzLmFuaW1hdGUpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmtFbGVtZW50cy5tYXAobGlua0VsID0+IHtcbiAgICAgIGNvbnN0IGVkZ2UgPSB0aGlzLmdyYXBoLmVkZ2VzLmZpbmQobGluID0+IGxpbi5pZCA9PT0gbGlua0VsLm5hdGl2ZUVsZW1lbnQuaWQpO1xuXG4gICAgICBpZiAoZWRnZSkge1xuICAgICAgICBjb25zdCBsaW5rU2VsZWN0aW9uID0gc2VsZWN0KGxpbmtFbC5uYXRpdmVFbGVtZW50KS5zZWxlY3QoJy5saW5lJyk7XG4gICAgICAgIGxpbmtTZWxlY3Rpb25cbiAgICAgICAgICAuYXR0cignZCcsIGVkZ2Uub2xkTGluZSlcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmVhc2UoZWFzZS5lYXNlU2luSW5PdXQpXG4gICAgICAgICAgLmR1cmF0aW9uKF9hbmltYXRlID8gNTAwIDogMClcbiAgICAgICAgICAuYXR0cignZCcsIGVkZ2UubGluZSk7XG5cbiAgICAgICAgY29uc3QgdGV4dFBhdGhTZWxlY3Rpb24gPSBzZWxlY3QodGhpcy5jaGFydEVsZW1lbnQubmF0aXZlRWxlbWVudCkuc2VsZWN0KGAjJHtlZGdlLmlkfWApO1xuICAgICAgICB0ZXh0UGF0aFNlbGVjdGlvblxuICAgICAgICAgIC5hdHRyKCdkJywgZWRnZS5vbGRUZXh0UGF0aClcbiAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgLmVhc2UoZWFzZS5lYXNlU2luSW5PdXQpXG4gICAgICAgICAgLmR1cmF0aW9uKF9hbmltYXRlID8gNTAwIDogMClcbiAgICAgICAgICAuYXR0cignZCcsIGVkZ2UudGV4dFBhdGgpO1xuXG4gICAgICAgIHRoaXMudXBkYXRlTWlkcG9pbnRPbkVkZ2UoZWRnZSwgZWRnZS5wb2ludHMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0aGUgdGV4dCBkaXJlY3Rpb25zIC8gZmxpcHBpbmdcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBjYWxjRG9taW5hbnRCYXNlbGluZShsaW5rKTogdm9pZCB7XG4gICAgY29uc3QgZmlyc3RQb2ludCA9IGxpbmsucG9pbnRzWzBdO1xuICAgIGNvbnN0IGxhc3RQb2ludCA9IGxpbmsucG9pbnRzW2xpbmsucG9pbnRzLmxlbmd0aCAtIDFdO1xuICAgIGxpbmsub2xkVGV4dFBhdGggPSBsaW5rLnRleHRQYXRoO1xuXG4gICAgaWYgKGxhc3RQb2ludC54IDwgZmlyc3RQb2ludC54KSB7XG4gICAgICBsaW5rLmRvbWluYW50QmFzZWxpbmUgPSAndGV4dC1iZWZvcmUtZWRnZSc7XG5cbiAgICAgIC8vIHJldmVyc2UgdGV4dCBwYXRoIGZvciB3aGVuIGl0cyBmbGlwcGVkIHVwc2lkZSBkb3duXG4gICAgICBsaW5rLnRleHRQYXRoID0gdGhpcy5nZW5lcmF0ZUxpbmUoWy4uLmxpbmsucG9pbnRzXS5yZXZlcnNlKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaW5rLmRvbWluYW50QmFzZWxpbmUgPSAndGV4dC1hZnRlci1lZGdlJztcbiAgICAgIGxpbmsudGV4dFBhdGggPSBsaW5rLmxpbmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHRoZSBuZXcgbGluZSBwYXRoXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgZ2VuZXJhdGVMaW5lKHBvaW50czogYW55KTogYW55IHtcbiAgICBjb25zdCBsaW5lRnVuY3Rpb24gPSBzaGFwZVxuICAgICAgLmxpbmU8YW55PigpXG4gICAgICAueChkID0+IGQueClcbiAgICAgIC55KGQgPT4gZC55KVxuICAgICAgLmN1cnZlKHRoaXMuY3VydmUpO1xuICAgIHJldHVybiBsaW5lRnVuY3Rpb24ocG9pbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBab29tIHdhcyBpbnZva2VkIGZyb20gZXZlbnRcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvblpvb20oJGV2ZW50OiBXaGVlbEV2ZW50LCBkaXJlY3Rpb24pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5lbmFibGVUcmFja3BhZFN1cHBvcnQgJiYgISRldmVudC5jdHJsS2V5KSB7XG4gICAgICB0aGlzLnBhbigkZXZlbnQuZGVsdGFYICogLTEsICRldmVudC5kZWx0YVkgKiAtMSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgem9vbUZhY3RvciA9IDEgKyAoZGlyZWN0aW9uID09PSAnaW4nID8gdGhpcy56b29tU3BlZWQgOiAtdGhpcy56b29tU3BlZWQpO1xuXG4gICAgLy8gQ2hlY2sgdGhhdCB6b29taW5nIHdvdWxkbid0IHB1dCB1cyBvdXQgb2YgYm91bmRzXG4gICAgY29uc3QgbmV3Wm9vbUxldmVsID0gdGhpcy56b29tTGV2ZWwgKiB6b29tRmFjdG9yO1xuICAgIGlmIChuZXdab29tTGV2ZWwgPD0gdGhpcy5taW5ab29tTGV2ZWwgfHwgbmV3Wm9vbUxldmVsID49IHRoaXMubWF4Wm9vbUxldmVsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgem9vbWluZyBpcyBlbmFibGVkIG9yIG5vdFxuICAgIGlmICghdGhpcy5lbmFibGVab29tKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGFuT25ab29tID09PSB0cnVlICYmICRldmVudCkge1xuICAgICAgLy8gQWJzb2x1dGUgbW91c2UgWC9ZIG9uIHRoZSBzY3JlZW5cbiAgICAgIGNvbnN0IG1vdXNlWCA9ICRldmVudC5jbGllbnRYO1xuICAgICAgY29uc3QgbW91c2VZID0gJGV2ZW50LmNsaWVudFk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgbW91c2UgWC9ZIGludG8gYSBTVkcgWC9ZXG4gICAgICBjb25zdCBzdmcgPSB0aGlzLmNoYXJ0Lm5hdGl2ZUVsZW1lbnQucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgICBjb25zdCBzdmdHcm91cCA9IHN2Zy5xdWVyeVNlbGVjdG9yKCdnLmNoYXJ0Jyk7XG5cbiAgICAgIGNvbnN0IHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KCk7XG4gICAgICBwb2ludC54ID0gbW91c2VYO1xuICAgICAgcG9pbnQueSA9IG1vdXNlWTtcbiAgICAgIGNvbnN0IHN2Z1BvaW50ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKHN2Z0dyb3VwLmdldFNjcmVlbkNUTSgpLmludmVyc2UoKSk7XG5cbiAgICAgIC8vIFBhbnpvb21cbiAgICAgIHRoaXMucGFuKHN2Z1BvaW50LngsIHN2Z1BvaW50LnksIHRydWUpO1xuICAgICAgdGhpcy56b29tKHpvb21GYWN0b3IpO1xuICAgICAgdGhpcy5wYW4oLXN2Z1BvaW50LngsIC1zdmdQb2ludC55LCB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy56b29tKHpvb21GYWN0b3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYW4gYnkgeC95XG4gICAqXG4gICAqIEBwYXJhbSB4XG4gICAqIEBwYXJhbSB5XG4gICAqL1xuICBwYW4oeDogbnVtYmVyLCB5OiBudW1iZXIsIGlnbm9yZVpvb21MZXZlbDogYm9vbGVhbiA9IGZhbHNlKTogdm9pZCB7XG4gICAgY29uc3Qgem9vbUxldmVsID0gaWdub3JlWm9vbUxldmVsID8gMSA6IHRoaXMuem9vbUxldmVsO1xuICAgIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXggPSB0cmFuc2Zvcm0odGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeCwgdHJhbnNsYXRlKHggLyB6b29tTGV2ZWwsIHkgLyB6b29tTGV2ZWwpKTtcblxuICAgIHRoaXMudXBkYXRlVHJhbnNmb3JtKCk7XG4gIH1cblxuICAvKipcbiAgICogUGFuIHRvIGEgZml4ZWQgeC95XG4gICAqXG4gICAqL1xuICBwYW5Ubyh4OiBudW1iZXIsIHk6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh4ID09PSBudWxsIHx8IHggPT09IHVuZGVmaW5lZCB8fCBpc05hTih4KSB8fCB5ID09PSBudWxsIHx8IHkgPT09IHVuZGVmaW5lZCB8fCBpc05hTih5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhblggPSAtdGhpcy5wYW5PZmZzZXRYIC0geCAqIHRoaXMuem9vbUxldmVsICsgdGhpcy5kaW1zLndpZHRoIC8gMjtcbiAgICBjb25zdCBwYW5ZID0gLXRoaXMucGFuT2Zmc2V0WSAtIHkgKiB0aGlzLnpvb21MZXZlbCArIHRoaXMuZGltcy5oZWlnaHQgLyAyO1xuXG4gICAgdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeCA9IHRyYW5zZm9ybShcbiAgICAgIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXgsXG4gICAgICB0cmFuc2xhdGUocGFuWCAvIHRoaXMuem9vbUxldmVsLCBwYW5ZIC8gdGhpcy56b29tTGV2ZWwpXG4gICAgKTtcblxuICAgIHRoaXMudXBkYXRlVHJhbnNmb3JtKCk7XG4gIH1cblxuICAvKipcbiAgICogWm9vbSBieSBhIGZhY3RvclxuICAgKlxuICAgKi9cbiAgem9vbShmYWN0b3I6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXggPSB0cmFuc2Zvcm0odGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeCwgc2NhbGUoZmFjdG9yLCBmYWN0b3IpKTtcbiAgICB0aGlzLnpvb21DaGFuZ2UuZW1pdCh0aGlzLnpvb21MZXZlbCk7XG4gICAgdGhpcy51cGRhdGVUcmFuc2Zvcm0oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBab29tIHRvIGEgZml4ZWQgbGV2ZWxcbiAgICpcbiAgICovXG4gIHpvb21UbyhsZXZlbDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5hID0gaXNOYU4obGV2ZWwpID8gdGhpcy50cmFuc2Zvcm1hdGlvbk1hdHJpeC5hIDogTnVtYmVyKGxldmVsKTtcbiAgICB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4LmQgPSBpc05hTihsZXZlbCkgPyB0aGlzLnRyYW5zZm9ybWF0aW9uTWF0cml4LmQgOiBOdW1iZXIobGV2ZWwpO1xuICAgIHRoaXMuem9vbUNoYW5nZS5lbWl0KHRoaXMuem9vbUxldmVsKTtcbiAgICB0aGlzLnVwZGF0ZVRyYW5zZm9ybSgpO1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogRHJhZyB3YXMgaW52b2tlZCBmcm9tIGFuIGV2ZW50XG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25EcmFnKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmRyYWdnaW5nRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBub2RlID0gdGhpcy5kcmFnZ2luZ05vZGU7XG4gICAgaWYgKHRoaXMubGF5b3V0ICYmIHR5cGVvZiB0aGlzLmxheW91dCAhPT0gJ3N0cmluZycgJiYgdGhpcy5sYXlvdXQub25EcmFnKSB7XG4gICAgICB0aGlzLmxheW91dC5vbkRyYWcobm9kZSwgZXZlbnQpO1xuICAgIH1cblxuICAgIG5vZGUucG9zaXRpb24ueCArPSBldmVudC5tb3ZlbWVudFggLyB0aGlzLnpvb21MZXZlbDtcbiAgICBub2RlLnBvc2l0aW9uLnkgKz0gZXZlbnQubW92ZW1lbnRZIC8gdGhpcy56b29tTGV2ZWw7XG5cbiAgICAvLyBtb3ZlIHRoZSBub2RlXG4gICAgY29uc3QgeCA9IG5vZGUucG9zaXRpb24ueCAtIG5vZGUuZGltZW5zaW9uLndpZHRoIC8gMjtcbiAgICBjb25zdCB5ID0gbm9kZS5wb3NpdGlvbi55IC0gbm9kZS5kaW1lbnNpb24uaGVpZ2h0IC8gMjtcbiAgICBub2RlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt4fSwgJHt5fSlgO1xuXG4gICAgZm9yIChjb25zdCBsaW5rIG9mIHRoaXMuZ3JhcGguZWRnZXMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgbGluay50YXJnZXQgPT09IG5vZGUuaWQgfHxcbiAgICAgICAgbGluay5zb3VyY2UgPT09IG5vZGUuaWQgfHxcbiAgICAgICAgKGxpbmsudGFyZ2V0IGFzIGFueSkuaWQgPT09IG5vZGUuaWQgfHxcbiAgICAgICAgKGxpbmsuc291cmNlIGFzIGFueSkuaWQgPT09IG5vZGUuaWRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5sYXlvdXQgJiYgdHlwZW9mIHRoaXMubGF5b3V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMubGF5b3V0LnVwZGF0ZUVkZ2UodGhpcy5ncmFwaCwgbGluayk7XG4gICAgICAgICAgY29uc3QgcmVzdWx0JCA9IHJlc3VsdCBpbnN0YW5jZW9mIE9ic2VydmFibGUgPyByZXN1bHQgOiBvZihyZXN1bHQpO1xuICAgICAgICAgIHRoaXMuZ3JhcGhTdWJzY3JpcHRpb24uYWRkKFxuICAgICAgICAgICAgcmVzdWx0JC5zdWJzY3JpYmUoZ3JhcGggPT4ge1xuICAgICAgICAgICAgICB0aGlzLmdyYXBoID0gZ3JhcGg7XG4gICAgICAgICAgICAgIHRoaXMucmVkcmF3RWRnZShsaW5rKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucmVkcmF3TGluZXMoZmFsc2UpO1xuICAgIHRoaXMudXBkYXRlTWluaW1hcCgpO1xuICB9XG5cbiAgcmVkcmF3RWRnZShlZGdlOiBFZGdlKSB7XG4gICAgY29uc3QgbGluZSA9IHRoaXMuZ2VuZXJhdGVMaW5lKGVkZ2UucG9pbnRzKTtcbiAgICB0aGlzLmNhbGNEb21pbmFudEJhc2VsaW5lKGVkZ2UpO1xuICAgIGVkZ2Uub2xkTGluZSA9IGVkZ2UubGluZTtcbiAgICBlZGdlLmxpbmUgPSBsaW5lO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgZW50aXJlIHZpZXcgZm9yIHRoZSBuZXcgcGFuIHBvc2l0aW9uXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgdXBkYXRlVHJhbnNmb3JtKCk6IHZvaWQge1xuICAgIHRoaXMudHJhbnNmb3JtID0gdG9TVkcoc21vb3RoTWF0cml4KHRoaXMudHJhbnNmb3JtYXRpb25NYXRyaXgsIDEwMCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5vZGUgd2FzIGNsaWNrZWRcbiAgICpcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvbkNsaWNrKGV2ZW50OiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLnNlbGVjdC5lbWl0KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOb2RlIHdhcyBmb2N1c2VkXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25BY3RpdmF0ZShldmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmFjdGl2ZUVudHJpZXMuaW5kZXhPZihldmVudCkgPiAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmFjdGl2ZUVudHJpZXMgPSBbZXZlbnQsIC4uLnRoaXMuYWN0aXZlRW50cmllc107XG4gICAgdGhpcy5hY3RpdmF0ZS5lbWl0KHsgdmFsdWU6IGV2ZW50LCBlbnRyaWVzOiB0aGlzLmFjdGl2ZUVudHJpZXMgfSk7XG4gIH1cblxuICAvKipcbiAgICogTm9kZSB3YXMgZGVmb2N1c2VkXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgb25EZWFjdGl2YXRlKGV2ZW50KTogdm9pZCB7XG4gICAgY29uc3QgaWR4ID0gdGhpcy5hY3RpdmVFbnRyaWVzLmluZGV4T2YoZXZlbnQpO1xuXG4gICAgdGhpcy5hY3RpdmVFbnRyaWVzLnNwbGljZShpZHgsIDEpO1xuICAgIHRoaXMuYWN0aXZlRW50cmllcyA9IFsuLi50aGlzLmFjdGl2ZUVudHJpZXNdO1xuXG4gICAgdGhpcy5kZWFjdGl2YXRlLmVtaXQoeyB2YWx1ZTogZXZlbnQsIGVudHJpZXM6IHRoaXMuYWN0aXZlRW50cmllcyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRvbWFpbiBzZXJpZXMgZm9yIHRoZSBub2Rlc1xuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIGdldFNlcmllc0RvbWFpbigpOiBhbnlbXSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXNcbiAgICAgIC5tYXAoZCA9PiB0aGlzLmdyb3VwUmVzdWx0c0J5KGQpKVxuICAgICAgLnJlZHVjZSgobm9kZXM6IHN0cmluZ1tdLCBub2RlKTogYW55W10gPT4gKG5vZGVzLmluZGV4T2Yobm9kZSkgIT09IC0xID8gbm9kZXMgOiBub2Rlcy5jb25jYXQoW25vZGVdKSksIFtdKVxuICAgICAgLnNvcnQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFja2luZyBmb3IgdGhlIGxpbmtcbiAgICpcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICB0cmFja0xpbmtCeShpbmRleDogbnVtYmVyLCBsaW5rOiBFZGdlKTogYW55IHtcbiAgICByZXR1cm4gbGluay5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFja2luZyBmb3IgdGhlIG5vZGVcbiAgICpcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICB0cmFja05vZGVCeShpbmRleDogbnVtYmVyLCBub2RlOiBOb2RlKTogYW55IHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjb2xvcnMgdGhlIG5vZGVzXG4gICAqXG4gICAqXG4gICAqIEBtZW1iZXJPZiBHcmFwaENvbXBvbmVudFxuICAgKi9cbiAgc2V0Q29sb3JzKCk6IHZvaWQge1xuICAgIHRoaXMuY29sb3JzID0gbmV3IENvbG9ySGVscGVyKHRoaXMuc2NoZW1lLCAnb3JkaW5hbCcsIHRoaXMuc2VyaWVzRG9tYWluLCB0aGlzLmN1c3RvbUNvbG9ycyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbGVnZW5kIG9wdGlvbnNcbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBnZXRMZWdlbmRPcHRpb25zKCk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjYWxlVHlwZTogJ29yZGluYWwnLFxuICAgICAgZG9tYWluOiB0aGlzLnNlcmllc0RvbWFpbixcbiAgICAgIGNvbG9yczogdGhpcy5jb2xvcnNcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE9uIG1vdXNlIG1vdmUgZXZlbnQsIHVzZWQgZm9yIHBhbm5pbmcgYW5kIGRyYWdnaW5nLlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50Om1vdXNlbW92ZScsIFsnJGV2ZW50J10pXG4gIG9uTW91c2VNb3ZlKCRldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuaXNNb3VzZU1vdmVDYWxsZWQgPSB0cnVlO1xuICAgIGlmICgodGhpcy5pc1Bhbm5pbmcgfHwgdGhpcy5pc01pbmltYXBQYW5uaW5nKSAmJiB0aGlzLnBhbm5pbmdFbmFibGVkKSB7XG4gICAgICB0aGlzLnBhbldpdGhDb25zdHJhaW50cyh0aGlzLnBhbm5pbmdBeGlzLCAkZXZlbnQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0RyYWdnaW5nICYmIHRoaXMuZHJhZ2dpbmdFbmFibGVkKSB7XG4gICAgICB0aGlzLm9uRHJhZygkZXZlbnQpO1xuICAgIH1cbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50Om1vdXNlZG93bicsIFsnJGV2ZW50J10pXG4gIG9uTW91c2VEb3duKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5pc01vdXNlTW92ZUNhbGxlZCA9IGZhbHNlO1xuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignZG9jdW1lbnQ6Y2xpY2snLCBbJyRldmVudCddKVxuICBncmFwaENsaWNrKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzTW91c2VNb3ZlQ2FsbGVkKSB0aGlzLmNsaWNrSGFuZGxlci5lbWl0KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbiB0b3VjaCBzdGFydCBldmVudCB0byBlbmFibGUgcGFubmluZy5cbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvblRvdWNoU3RhcnQoZXZlbnQ6IGFueSk6IHZvaWQge1xuICAgIHRoaXMuX3RvdWNoTGFzdFggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRYO1xuICAgIHRoaXMuX3RvdWNoTGFzdFkgPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXS5jbGllbnRZO1xuXG4gICAgdGhpcy5pc1Bhbm5pbmcgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIE9uIHRvdWNoIG1vdmUgZXZlbnQsIHVzZWQgZm9yIHBhbm5pbmcuXG4gICAqXG4gICAqL1xuICBASG9zdExpc3RlbmVyKCdkb2N1bWVudDp0b3VjaG1vdmUnLCBbJyRldmVudCddKVxuICBvblRvdWNoTW92ZSgkZXZlbnQ6IGFueSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzUGFubmluZyAmJiB0aGlzLnBhbm5pbmdFbmFibGVkKSB7XG4gICAgICBjb25zdCBjbGllbnRYID0gJGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdLmNsaWVudFg7XG4gICAgICBjb25zdCBjbGllbnRZID0gJGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdLmNsaWVudFk7XG4gICAgICBjb25zdCBtb3ZlbWVudFggPSBjbGllbnRYIC0gdGhpcy5fdG91Y2hMYXN0WDtcbiAgICAgIGNvbnN0IG1vdmVtZW50WSA9IGNsaWVudFkgLSB0aGlzLl90b3VjaExhc3RZO1xuICAgICAgdGhpcy5fdG91Y2hMYXN0WCA9IGNsaWVudFg7XG4gICAgICB0aGlzLl90b3VjaExhc3RZID0gY2xpZW50WTtcblxuICAgICAgdGhpcy5wYW4obW92ZW1lbnRYLCBtb3ZlbWVudFkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPbiB0b3VjaCBlbmQgZXZlbnQgdG8gZGlzYWJsZSBwYW5uaW5nLlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uVG91Y2hFbmQoZXZlbnQ6IGFueSkge1xuICAgIHRoaXMuaXNQYW5uaW5nID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogT24gbW91c2UgdXAgZXZlbnQgdG8gZGlzYWJsZSBwYW5uaW5nL2RyYWdnaW5nLlxuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50Om1vdXNldXAnLCBbJyRldmVudCddKVxuICBvbk1vdXNlVXAoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmlzUGFubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuaXNNaW5pbWFwUGFubmluZyA9IGZhbHNlO1xuICAgIGlmICh0aGlzLmxheW91dCAmJiB0eXBlb2YgdGhpcy5sYXlvdXQgIT09ICdzdHJpbmcnICYmIHRoaXMubGF5b3V0Lm9uRHJhZ0VuZCkge1xuICAgICAgdGhpcy5sYXlvdXQub25EcmFnRW5kKHRoaXMuZHJhZ2dpbmdOb2RlLCBldmVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9uIG5vZGUgbW91c2UgZG93biB0byBraWNrIG9mZiBkcmFnZ2luZ1xuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uTm9kZU1vdXNlRG93bihldmVudDogTW91c2VFdmVudCwgbm9kZTogYW55KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmRyYWdnaW5nRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgIHRoaXMuZHJhZ2dpbmdOb2RlID0gbm9kZTtcblxuICAgIGlmICh0aGlzLmxheW91dCAmJiB0eXBlb2YgdGhpcy5sYXlvdXQgIT09ICdzdHJpbmcnICYmIHRoaXMubGF5b3V0Lm9uRHJhZ1N0YXJ0KSB7XG4gICAgICB0aGlzLmxheW91dC5vbkRyYWdTdGFydChub2RlLCBldmVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9uIG1pbmltYXAgZHJhZyBtb3VzZSBkb3duIHRvIGtpY2sgb2ZmIG1pbmltYXAgcGFubmluZ1xuICAgKlxuICAgKiBAbWVtYmVyT2YgR3JhcGhDb21wb25lbnRcbiAgICovXG4gIG9uTWluaW1hcERyYWdNb3VzZURvd24oKTogdm9pZCB7XG4gICAgdGhpcy5pc01pbmltYXBQYW5uaW5nID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbiBtaW5pbWFwIHBhbiBldmVudC4gUGFucyB0aGUgZ3JhcGggdG8gdGhlIGNsaWNrZWQgcG9zaXRpb25cbiAgICpcbiAgICogQG1lbWJlck9mIEdyYXBoQ29tcG9uZW50XG4gICAqL1xuICBvbk1pbmltYXBQYW5UbyhldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIGxldCB4ID1cbiAgICAgIGV2ZW50Lm9mZnNldFggLSAodGhpcy5kaW1zLndpZHRoIC0gKHRoaXMuZ3JhcGhEaW1zLndpZHRoICsgdGhpcy5taW5pbWFwT2Zmc2V0WCkgLyB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50KTtcbiAgICBsZXQgeSA9IGV2ZW50Lm9mZnNldFkgKyB0aGlzLm1pbmltYXBPZmZzZXRZIC8gdGhpcy5taW5pbWFwU2NhbGVDb2VmZmljaWVudDtcblxuICAgIHRoaXMucGFuVG8oeCAqIHRoaXMubWluaW1hcFNjYWxlQ29lZmZpY2llbnQsIHkgKiB0aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50KTtcbiAgICB0aGlzLmlzTWluaW1hcFBhbm5pbmcgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENlbnRlciB0aGUgZ3JhcGggaW4gdGhlIHZpZXdwb3J0XG4gICAqL1xuICBjZW50ZXIoKTogdm9pZCB7XG4gICAgdGhpcy5wYW5Ubyh0aGlzLmdyYXBoRGltcy53aWR0aCAvIDIsIHRoaXMuZ3JhcGhEaW1zLmhlaWdodCAvIDIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFpvb21zIHRvIGZpdCB0aGUgZW50aWVyIGdyYXBoXG4gICAqL1xuICB6b29tVG9GaXQoKTogdm9pZCB7XG5cbiAgICBjb25zdCBtYXJnaW4gPSB7XG4gICAgICB4OiB0aGlzLnpvb21Ub0ZpdE1hcmdpbj8ueCB8fCAwLFxuICAgICAgeTogdGhpcy56b29tVG9GaXRNYXJnaW4/LnkgfHwgMCxcbiAgICB9XG5cbiAgICAvLyBNYXJnaW4gdmFsdWUgaXMgeDIgZm9yIHRvcC9ib3R0b20gYW5kIGxlZnQvcmlnaHRcbiAgICBjb25zdCBoZWlnaHRab29tID0gdGhpcy5kaW1zLmhlaWdodCAvICh0aGlzLmdyYXBoRGltcy5oZWlnaHQgKyBtYXJnaW4ueSAqIDIpO1xuICAgIGNvbnN0IHdpZHRoWm9vbSA9IHRoaXMuZGltcy53aWR0aCAvICh0aGlzLmdyYXBoRGltcy53aWR0aCArIG1hcmdpbi54ICogMik7XG4gICAgbGV0IHpvb21MZXZlbCA9IE1hdGgubWluKGhlaWdodFpvb20sIHdpZHRoWm9vbSwgMSk7XG5cbiAgICBpZiAoem9vbUxldmVsIDwgdGhpcy5taW5ab29tTGV2ZWwpIHtcbiAgICAgIHpvb21MZXZlbCA9IHRoaXMubWluWm9vbUxldmVsO1xuICAgIH1cblxuICAgIGlmICh6b29tTGV2ZWwgPiB0aGlzLm1heFpvb21MZXZlbCkge1xuICAgICAgem9vbUxldmVsID0gdGhpcy5tYXhab29tTGV2ZWw7XG4gICAgfVxuXG4gICAgaWYgKHpvb21MZXZlbCAhPT0gdGhpcy56b29tTGV2ZWwpIHtcbiAgICAgIHRoaXMuem9vbUxldmVsID0gem9vbUxldmVsO1xuICAgICAgdGhpcy51cGRhdGVUcmFuc2Zvcm0oKTtcbiAgICAgIHRoaXMuem9vbUNoYW5nZS5lbWl0KHRoaXMuem9vbUxldmVsKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFucyB0byB0aGUgbm9kZVxuICAgKiBAcGFyYW0gbm9kZUlkXG4gICAqL1xuICBwYW5Ub05vZGVJZChub2RlSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdyYXBoLm5vZGVzLmZpbmQobiA9PiBuLmlkID09PSBub2RlSWQpO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGFuVG8obm9kZS5wb3NpdGlvbi54LCBub2RlLnBvc2l0aW9uLnkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwYW5XaXRoQ29uc3RyYWludHMoa2V5OiBzdHJpbmcsIGV2ZW50OiBNb3VzZUV2ZW50KSB7XG4gICAgbGV0IHggPSBldmVudC5tb3ZlbWVudFg7XG4gICAgbGV0IHkgPSBldmVudC5tb3ZlbWVudFk7XG4gICAgaWYgKHRoaXMuaXNNaW5pbWFwUGFubmluZykge1xuICAgICAgeCA9IC10aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50ICogeCAqIHRoaXMuem9vbUxldmVsO1xuICAgICAgeSA9IC10aGlzLm1pbmltYXBTY2FsZUNvZWZmaWNpZW50ICogeSAqIHRoaXMuem9vbUxldmVsO1xuICAgIH1cblxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICBjYXNlIFBhbm5pbmdBeGlzLkhvcml6b250YWw6XG4gICAgICAgIHRoaXMucGFuKHgsIDApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUGFubmluZ0F4aXMuVmVydGljYWw6XG4gICAgICAgIHRoaXMucGFuKDAsIHkpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMucGFuKHgsIHkpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZU1pZHBvaW50T25FZGdlKGVkZ2U6IEVkZ2UsIHBvaW50czogYW55KTogdm9pZCB7XG4gICAgaWYgKCFlZGdlIHx8ICFwb2ludHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocG9pbnRzLmxlbmd0aCAlIDIgPT09IDEpIHtcbiAgICAgIGVkZ2UubWlkUG9pbnQgPSBwb2ludHNbTWF0aC5mbG9vcihwb2ludHMubGVuZ3RoIC8gMildO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBfZmlyc3QgPSBwb2ludHNbcG9pbnRzLmxlbmd0aCAvIDJdO1xuICAgICAgY29uc3QgX3NlY29uZCA9IHBvaW50c1twb2ludHMubGVuZ3RoIC8gMiAtIDFdO1xuICAgICAgZWRnZS5taWRQb2ludCA9IHtcbiAgICAgICAgeDogKF9maXJzdC54ICsgX3NlY29uZC54KSAvIDIsXG4gICAgICAgIHk6IChfZmlyc3QueSArIF9zZWNvbmQueSkgLyAyXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIl19