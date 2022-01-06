(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('@angular/animations'), require('d3-selection'), require('d3-shape'), require('d3-ease'), require('d3-transition'), require('rxjs'), require('rxjs/operators'), require('transformation-matrix'), require('dagre'), require('d3-force'), require('webcola'), require('d3-dispatch'), require('d3-timer'), require('d3-scale')) :
    typeof define === 'function' && define.amd ? define('@swimlane/ngx-graph', ['exports', '@angular/core', '@angular/common', '@angular/animations', 'd3-selection', 'd3-shape', 'd3-ease', 'd3-transition', 'rxjs', 'rxjs/operators', 'transformation-matrix', 'dagre', 'd3-force', 'webcola', 'd3-dispatch', 'd3-timer', 'd3-scale'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.swimlane = global.swimlane || {}, global.swimlane["ngx-graph"] = {}), global.ng.core, global.ng.common, global.ng.animations, global.d3Selection, global.shape, global.ease, null, global.rxjs, global.rxjs.operators, global.transformationMatrix, global.dagre, global.d3Force, global.webcola, global.d3Dispatch, global.d3Timer, global.d3Scale));
})(this, (function (exports, core, common, animations, d3Selection, shape, ease, d3Transition, rxjs, operators, transformationMatrix, dagre, d3Force, webcola, d3Dispatch, d3Timer, d3Scale) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var shape__namespace = /*#__PURE__*/_interopNamespace(shape);
    var ease__namespace = /*#__PURE__*/_interopNamespace(ease);
    var dagre__namespace = /*#__PURE__*/_interopNamespace(dagre);
    var d3Force__namespace = /*#__PURE__*/_interopNamespace(d3Force);
    var d3Dispatch__namespace = /*#__PURE__*/_interopNamespace(d3Dispatch);
    var d3Timer__namespace = /*#__PURE__*/_interopNamespace(d3Timer);

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    var __assign = function () {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    function __rest(s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if (d = decorators[i])
                    r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }
    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); };
    }
    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
            return Reflect.metadata(metadataKey, metadataValue);
    }
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            } }
            function rejected(value) { try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }
    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function () { if (t[0] & 1)
                throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f)
                throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                        return t;
                    if (y = 0, t)
                        op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2])
                                _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                }
                catch (e) {
                    op = [6, e];
                    y = 0;
                }
                finally {
                    f = t = 0;
                }
            if (op[0] & 5)
                throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    }
    var __createBinding = Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    });
    function __exportStar(m, o) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
                __createBinding(o, m, p);
    }
    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
            return m.call(o);
        if (o && typeof o.length === "number")
            return {
                next: function () {
                    if (o && i >= o.length)
                        o = void 0;
                    return { value: o && o[i++], done: !o };
                }
            };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
            return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                ar.push(r.value);
        }
        catch (error) {
            e = { error: error };
        }
        finally {
            try {
                if (r && !r.done && (m = i["return"]))
                    m.call(i);
            }
            finally {
                if (e)
                    throw e.error;
            }
        }
        return ar;
    }
    /** @deprecated */
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }
    /** @deprecated */
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar)
                        ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    }
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }
    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n])
            i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try {
            step(g[n](v));
        }
        catch (e) {
            settle(q[0][3], e);
        } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]); }
    }
    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }
    function __asyncValues(o) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }); }, reject); }
    }
    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
        }
        else {
            cooked.raw = raw;
        }
        return cooked;
    }
    ;
    var __setModuleDefault = Object.create ? (function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function (o, v) {
        o["default"] = v;
    };
    function __importStar(mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }
    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }
    function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }
    function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m")
            throw new TypeError("Private method is not writable");
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    }

    var cache = {};
    /**
     * Generates a short id.
     *
     */
    function id() {
        var newId = ('0000' + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)).slice(-4);
        newId = "a" + newId;
        // ensure not already used
        if (!cache[newId]) {
            cache[newId] = true;
            return newId;
        }
        return id();
    }

    exports.Orientation = void 0;
    (function (Orientation) {
        Orientation["LEFT_TO_RIGHT"] = "LR";
        Orientation["RIGHT_TO_LEFT"] = "RL";
        Orientation["TOP_TO_BOTTOM"] = "TB";
        Orientation["BOTTOM_TO_TOM"] = "BT";
    })(exports.Orientation || (exports.Orientation = {}));
    exports.Alignment = void 0;
    (function (Alignment) {
        Alignment["CENTER"] = "C";
        Alignment["UP_LEFT"] = "UL";
        Alignment["UP_RIGHT"] = "UR";
        Alignment["DOWN_LEFT"] = "DL";
        Alignment["DOWN_RIGHT"] = "DR";
    })(exports.Alignment || (exports.Alignment = {}));
    var DagreLayout = /** @class */ (function () {
        function DagreLayout() {
            this.defaultSettings = {
                orientation: exports.Orientation.LEFT_TO_RIGHT,
                marginX: 20,
                marginY: 20,
                edgePadding: 100,
                rankPadding: 100,
                nodePadding: 50,
                multigraph: true,
                compound: true
            };
            this.settings = {};
        }
        DagreLayout.prototype.run = function (graph) {
            this.createDagreGraph(graph);
            dagre__namespace.layout(this.dagreGraph);
            graph.edgeLabels = this.dagreGraph._edgeLabels;
            var _loop_1 = function (dagreNodeId) {
                var dagreNode = this_1.dagreGraph._nodes[dagreNodeId];
                var node = graph.nodes.find(function (n) { return n.id === dagreNode.id; });
                node.position = {
                    x: dagreNode.x,
                    y: dagreNode.y
                };
                node.dimension = {
                    width: dagreNode.width,
                    height: dagreNode.height
                };
            };
            var this_1 = this;
            for (var dagreNodeId in this.dagreGraph._nodes) {
                _loop_1(dagreNodeId);
            }
            return graph;
        };
        DagreLayout.prototype.updateEdge = function (graph, edge) {
            var sourceNode = graph.nodes.find(function (n) { return n.id === edge.source; });
            var targetNode = graph.nodes.find(function (n) { return n.id === edge.target; });
            // determine new arrow position
            var dir = sourceNode.position.y <= targetNode.position.y ? -1 : 1;
            var startingPoint = {
                x: sourceNode.position.x,
                y: sourceNode.position.y - dir * (sourceNode.dimension.height / 2)
            };
            var endingPoint = {
                x: targetNode.position.x,
                y: targetNode.position.y + dir * (targetNode.dimension.height / 2)
            };
            // generate new points
            edge.points = [startingPoint, endingPoint];
            return graph;
        };
        DagreLayout.prototype.createDagreGraph = function (graph) {
            var e_1, _a, e_2, _b;
            var settings = Object.assign({}, this.defaultSettings, this.settings);
            this.dagreGraph = new dagre__namespace.graphlib.Graph({ compound: settings.compound, multigraph: settings.multigraph });
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
            this.dagreGraph.setDefaultEdgeLabel(function () {
                return {
                /* empty */
                };
            });
            this.dagreNodes = graph.nodes.map(function (n) {
                var node = Object.assign({}, n);
                node.width = n.dimension.width;
                node.height = n.dimension.height;
                node.x = n.position.x;
                node.y = n.position.y;
                return node;
            });
            this.dagreEdges = graph.edges.map(function (l) {
                var newLink = Object.assign({}, l);
                if (!newLink.id) {
                    newLink.id = id();
                }
                return newLink;
            });
            try {
                for (var _c = __values(this.dagreNodes), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var node = _d.value;
                    if (!node.width) {
                        node.width = 20;
                    }
                    if (!node.height) {
                        node.height = 30;
                    }
                    // update dagre
                    this.dagreGraph.setNode(node.id, node);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                // update dagre
                for (var _e = __values(this.dagreEdges), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var edge = _f.value;
                    if (settings.multigraph) {
                        this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.id);
                    }
                    else {
                        this.dagreGraph.setEdge(edge.source, edge.target);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return this.dagreGraph;
        };
        return DagreLayout;
    }());

    var DagreClusterLayout = /** @class */ (function () {
        function DagreClusterLayout() {
            this.defaultSettings = {
                orientation: exports.Orientation.LEFT_TO_RIGHT,
                marginX: 20,
                marginY: 20,
                edgePadding: 100,
                rankPadding: 100,
                nodePadding: 50,
                multigraph: true,
                compound: true
            };
            this.settings = {};
        }
        DagreClusterLayout.prototype.run = function (graph) {
            var _this = this;
            this.createDagreGraph(graph);
            dagre__namespace.layout(this.dagreGraph);
            graph.edgeLabels = this.dagreGraph._edgeLabels;
            var dagreToOutput = function (node) {
                var dagreNode = _this.dagreGraph._nodes[node.id];
                return Object.assign(Object.assign({}, node), { position: {
                        x: dagreNode.x,
                        y: dagreNode.y
                    }, dimension: {
                        width: dagreNode.width,
                        height: dagreNode.height
                    } });
            };
            graph.clusters = (graph.clusters || []).map(dagreToOutput);
            graph.nodes = graph.nodes.map(dagreToOutput);
            return graph;
        };
        DagreClusterLayout.prototype.updateEdge = function (graph, edge) {
            var sourceNode = graph.nodes.find(function (n) { return n.id === edge.source; });
            var targetNode = graph.nodes.find(function (n) { return n.id === edge.target; });
            // determine new arrow position
            var dir = sourceNode.position.y <= targetNode.position.y ? -1 : 1;
            var startingPoint = {
                x: sourceNode.position.x,
                y: sourceNode.position.y - dir * (sourceNode.dimension.height / 2)
            };
            var endingPoint = {
                x: targetNode.position.x,
                y: targetNode.position.y + dir * (targetNode.dimension.height / 2)
            };
            // generate new points
            edge.points = [startingPoint, endingPoint];
            return graph;
        };
        DagreClusterLayout.prototype.createDagreGraph = function (graph) {
            var e_1, _a, e_2, _b, e_3, _c;
            var _this = this;
            var settings = Object.assign({}, this.defaultSettings, this.settings);
            this.dagreGraph = new dagre__namespace.graphlib.Graph({ compound: settings.compound, multigraph: settings.multigraph });
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
            this.dagreGraph.setDefaultEdgeLabel(function () {
                return {
                /* empty */
                };
            });
            this.dagreNodes = graph.nodes.map(function (n) {
                var node = Object.assign({}, n);
                node.width = n.dimension.width;
                node.height = n.dimension.height;
                node.x = n.position.x;
                node.y = n.position.y;
                return node;
            });
            this.dagreClusters = graph.clusters || [];
            this.dagreEdges = graph.edges.map(function (l) {
                var newLink = Object.assign({}, l);
                if (!newLink.id) {
                    newLink.id = id();
                }
                return newLink;
            });
            try {
                for (var _d = __values(this.dagreNodes), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var node = _e.value;
                    this.dagreGraph.setNode(node.id, node);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var _loop_1 = function (cluster) {
                this_1.dagreGraph.setNode(cluster.id, cluster);
                cluster.childNodeIds.forEach(function (childNodeId) {
                    _this.dagreGraph.setParent(childNodeId, cluster.id);
                });
            };
            var this_1 = this;
            try {
                for (var _f = __values(this.dagreClusters), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var cluster = _g.value;
                    _loop_1(cluster);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // update dagre
                for (var _h = __values(this.dagreEdges), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var edge = _j.value;
                    if (settings.multigraph) {
                        this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.id);
                    }
                    else {
                        this.dagreGraph.setEdge(edge.source, edge.target);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return this.dagreGraph;
        };
        return DagreClusterLayout;
    }());

    var DEFAULT_EDGE_NAME = '\x00';
    var GRAPH_NODE = '\x00';
    var EDGE_KEY_DELIM = '\x01';
    var DagreNodesOnlyLayout = /** @class */ (function () {
        function DagreNodesOnlyLayout() {
            this.defaultSettings = {
                orientation: exports.Orientation.LEFT_TO_RIGHT,
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
        DagreNodesOnlyLayout.prototype.run = function (graph) {
            var e_1, _a;
            this.createDagreGraph(graph);
            dagre__namespace.layout(this.dagreGraph);
            graph.edgeLabels = this.dagreGraph._edgeLabels;
            var _loop_1 = function (dagreNodeId) {
                var dagreNode = this_1.dagreGraph._nodes[dagreNodeId];
                var node = graph.nodes.find(function (n) { return n.id === dagreNode.id; });
                node.position = {
                    x: dagreNode.x,
                    y: dagreNode.y
                };
                node.dimension = {
                    width: dagreNode.width,
                    height: dagreNode.height
                };
            };
            var this_1 = this;
            for (var dagreNodeId in this.dagreGraph._nodes) {
                _loop_1(dagreNodeId);
            }
            try {
                for (var _b = __values(graph.edges), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var edge = _c.value;
                    this.updateEdge(graph, edge);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return graph;
        };
        DagreNodesOnlyLayout.prototype.updateEdge = function (graph, edge) {
            var _a, _b, _c, _d;
            var sourceNode = graph.nodes.find(function (n) { return n.id === edge.source; });
            var targetNode = graph.nodes.find(function (n) { return n.id === edge.target; });
            var rankAxis = this.settings.orientation === 'BT' || this.settings.orientation === 'TB' ? 'y' : 'x';
            var orderAxis = rankAxis === 'y' ? 'x' : 'y';
            var rankDimension = rankAxis === 'y' ? 'height' : 'width';
            // determine new arrow position
            var dir = sourceNode.position[rankAxis] <= targetNode.position[rankAxis] ? -1 : 1;
            var startingPoint = (_a = {},
                _a[orderAxis] = sourceNode.position[orderAxis],
                _a[rankAxis] = sourceNode.position[rankAxis] - dir * (sourceNode.dimension[rankDimension] / 2),
                _a);
            var endingPoint = (_b = {},
                _b[orderAxis] = targetNode.position[orderAxis],
                _b[rankAxis] = targetNode.position[rankAxis] + dir * (targetNode.dimension[rankDimension] / 2),
                _b);
            var curveDistance = this.settings.curveDistance || this.defaultSettings.curveDistance;
            // generate new points
            edge.points = [
                startingPoint,
                (_c = {},
                    _c[orderAxis] = startingPoint[orderAxis],
                    _c[rankAxis] = startingPoint[rankAxis] - dir * curveDistance,
                    _c),
                (_d = {},
                    _d[orderAxis] = endingPoint[orderAxis],
                    _d[rankAxis] = endingPoint[rankAxis] + dir * curveDistance,
                    _d),
                endingPoint
            ];
            var edgeLabelId = "" + edge.source + EDGE_KEY_DELIM + edge.target + EDGE_KEY_DELIM + DEFAULT_EDGE_NAME;
            var matchingEdgeLabel = graph.edgeLabels[edgeLabelId];
            if (matchingEdgeLabel) {
                matchingEdgeLabel.points = edge.points;
            }
            return graph;
        };
        DagreNodesOnlyLayout.prototype.createDagreGraph = function (graph) {
            var e_2, _a, e_3, _b;
            var settings = Object.assign({}, this.defaultSettings, this.settings);
            this.dagreGraph = new dagre__namespace.graphlib.Graph({ compound: settings.compound, multigraph: settings.multigraph });
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
            this.dagreGraph.setDefaultEdgeLabel(function () {
                return {
                /* empty */
                };
            });
            this.dagreNodes = graph.nodes.map(function (n) {
                var node = Object.assign({}, n);
                node.width = n.dimension.width;
                node.height = n.dimension.height;
                node.x = n.position.x;
                node.y = n.position.y;
                return node;
            });
            this.dagreEdges = graph.edges.map(function (l) {
                var newLink = Object.assign({}, l);
                if (!newLink.id) {
                    newLink.id = id();
                }
                return newLink;
            });
            try {
                for (var _c = __values(this.dagreNodes), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var node = _d.value;
                    if (!node.width) {
                        node.width = 20;
                    }
                    if (!node.height) {
                        node.height = 30;
                    }
                    // update dagre
                    this.dagreGraph.setNode(node.id, node);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // update dagre
                for (var _e = __values(this.dagreEdges), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var edge = _f.value;
                    if (settings.multigraph) {
                        this.dagreGraph.setEdge(edge.source, edge.target, edge, edge.id);
                    }
                    else {
                        this.dagreGraph.setEdge(edge.source, edge.target);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return this.dagreGraph;
        };
        return DagreNodesOnlyLayout;
    }());

    function toD3Node(maybeNode) {
        if (typeof maybeNode === 'string') {
            return {
                id: maybeNode,
                x: 0,
                y: 0
            };
        }
        return maybeNode;
    }
    var D3ForceDirectedLayout = /** @class */ (function () {
        function D3ForceDirectedLayout() {
            this.defaultSettings = {
                force: d3Force.forceSimulation().force('charge', d3Force.forceManyBody().strength(-150)).force('collide', d3Force.forceCollide(5)),
                forceLink: d3Force.forceLink()
                    .id(function (node) { return node.id; })
                    .distance(function () { return 100; })
            };
            this.settings = {};
            this.outputGraph$ = new rxjs.Subject();
        }
        D3ForceDirectedLayout.prototype.run = function (graph) {
            var _this = this;
            this.inputGraph = graph;
            this.d3Graph = {
                nodes: __spreadArray([], __read(this.inputGraph.nodes.map(function (n) { return (Object.assign({}, n)); }))),
                edges: __spreadArray([], __read(this.inputGraph.edges.map(function (e) { return (Object.assign({}, e)); })))
            };
            this.outputGraph = {
                nodes: [],
                edges: [],
                edgeLabels: []
            };
            this.outputGraph$.next(this.outputGraph);
            this.settings = Object.assign({}, this.defaultSettings, this.settings);
            if (this.settings.force) {
                this.settings.force
                    .nodes(this.d3Graph.nodes)
                    .force('link', this.settings.forceLink.links(this.d3Graph.edges))
                    .alpha(0.5)
                    .restart()
                    .on('tick', function () {
                    _this.outputGraph$.next(_this.d3GraphToOutputGraph(_this.d3Graph));
                });
            }
            return this.outputGraph$.asObservable();
        };
        D3ForceDirectedLayout.prototype.updateEdge = function (graph, edge) {
            var _this = this;
            var settings = Object.assign({}, this.defaultSettings, this.settings);
            if (settings.force) {
                settings.force
                    .nodes(this.d3Graph.nodes)
                    .force('link', settings.forceLink.links(this.d3Graph.edges))
                    .alpha(0.5)
                    .restart()
                    .on('tick', function () {
                    _this.outputGraph$.next(_this.d3GraphToOutputGraph(_this.d3Graph));
                });
            }
            return this.outputGraph$.asObservable();
        };
        D3ForceDirectedLayout.prototype.d3GraphToOutputGraph = function (d3Graph) {
            this.outputGraph.nodes = this.d3Graph.nodes.map(function (node) { return (Object.assign(Object.assign({}, node), { id: node.id || id(), position: {
                    x: node.x,
                    y: node.y
                }, dimension: {
                    width: (node.dimension && node.dimension.width) || 20,
                    height: (node.dimension && node.dimension.height) || 20
                }, transform: "translate(" + (node.x - ((node.dimension && node.dimension.width) || 20) / 2 || 0) + ", " + (node.y - ((node.dimension && node.dimension.height) || 20) / 2 || 0) + ")" })); });
            this.outputGraph.edges = this.d3Graph.edges.map(function (edge) { return (Object.assign(Object.assign({}, edge), { source: toD3Node(edge.source).id, target: toD3Node(edge.target).id, points: [
                    {
                        x: toD3Node(edge.source).x,
                        y: toD3Node(edge.source).y
                    },
                    {
                        x: toD3Node(edge.target).x,
                        y: toD3Node(edge.target).y
                    }
                ] })); });
            this.outputGraph.edgeLabels = this.outputGraph.edges;
            return this.outputGraph;
        };
        D3ForceDirectedLayout.prototype.onDragStart = function (draggingNode, $event) {
            this.settings.force.alphaTarget(0.3).restart();
            var node = this.d3Graph.nodes.find(function (d3Node) { return d3Node.id === draggingNode.id; });
            if (!node) {
                return;
            }
            this.draggingStart = { x: $event.x - node.x, y: $event.y - node.y };
            node.fx = $event.x - this.draggingStart.x;
            node.fy = $event.y - this.draggingStart.y;
        };
        D3ForceDirectedLayout.prototype.onDrag = function (draggingNode, $event) {
            if (!draggingNode) {
                return;
            }
            var node = this.d3Graph.nodes.find(function (d3Node) { return d3Node.id === draggingNode.id; });
            if (!node) {
                return;
            }
            node.fx = $event.x - this.draggingStart.x;
            node.fy = $event.y - this.draggingStart.y;
        };
        D3ForceDirectedLayout.prototype.onDragEnd = function (draggingNode, $event) {
            if (!draggingNode) {
                return;
            }
            var node = this.d3Graph.nodes.find(function (d3Node) { return d3Node.id === draggingNode.id; });
            if (!node) {
                return;
            }
            this.settings.force.alphaTarget(0);
            node.fx = undefined;
            node.fy = undefined;
        };
        return D3ForceDirectedLayout;
    }());

    function toNode(nodes, nodeRef) {
        if (typeof nodeRef === 'number') {
            return nodes[nodeRef];
        }
        return nodeRef;
    }
    var ColaForceDirectedLayout = /** @class */ (function () {
        function ColaForceDirectedLayout() {
            this.defaultSettings = {
                force: webcola.d3adaptor(Object.assign(Object.assign(Object.assign({}, d3Dispatch__namespace), d3Force__namespace), d3Timer__namespace))
                    .linkDistance(150)
                    .avoidOverlaps(true),
                viewDimensions: {
                    width: 600,
                    height: 600
                }
            };
            this.settings = {};
            this.outputGraph$ = new rxjs.Subject();
        }
        ColaForceDirectedLayout.prototype.run = function (graph) {
            var _this = this;
            this.inputGraph = graph;
            if (!this.inputGraph.clusters) {
                this.inputGraph.clusters = [];
            }
            this.internalGraph = {
                nodes: __spreadArray([], __read(this.inputGraph.nodes.map(function (n) { return (Object.assign(Object.assign({}, n), { width: n.dimension ? n.dimension.width : 20, height: n.dimension ? n.dimension.height : 20 })); }))),
                groups: __spreadArray([], __read(this.inputGraph.clusters.map(function (cluster) { return ({
                    padding: 5,
                    groups: cluster.childNodeIds
                        .map(function (nodeId) { return _this.inputGraph.clusters.findIndex(function (node) { return node.id === nodeId; }); })
                        .filter(function (x) { return x >= 0; }),
                    leaves: cluster.childNodeIds
                        .map(function (nodeId) { return _this.inputGraph.nodes.findIndex(function (node) { return node.id === nodeId; }); })
                        .filter(function (x) { return x >= 0; })
                }); }))),
                links: __spreadArray([], __read(this.inputGraph.edges
                    .map(function (e) {
                    var sourceNodeIndex = _this.inputGraph.nodes.findIndex(function (node) { return e.source === node.id; });
                    var targetNodeIndex = _this.inputGraph.nodes.findIndex(function (node) { return e.target === node.id; });
                    if (sourceNodeIndex === -1 || targetNodeIndex === -1) {
                        return undefined;
                    }
                    return Object.assign(Object.assign({}, e), { source: sourceNodeIndex, target: targetNodeIndex });
                })
                    .filter(function (x) { return !!x; }))),
                groupLinks: __spreadArray([], __read(this.inputGraph.edges
                    .map(function (e) {
                    var sourceNodeIndex = _this.inputGraph.nodes.findIndex(function (node) { return e.source === node.id; });
                    var targetNodeIndex = _this.inputGraph.nodes.findIndex(function (node) { return e.target === node.id; });
                    if (sourceNodeIndex >= 0 && targetNodeIndex >= 0) {
                        return undefined;
                    }
                    return e;
                })
                    .filter(function (x) { return !!x; })))
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
                    .on('tick', function () {
                    if (_this.settings.onTickListener) {
                        _this.settings.onTickListener(_this.internalGraph);
                    }
                    _this.outputGraph$.next(_this.internalGraphToOutputGraph(_this.internalGraph));
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
        };
        ColaForceDirectedLayout.prototype.updateEdge = function (graph, edge) {
            var settings = Object.assign({}, this.defaultSettings, this.settings);
            if (settings.force) {
                settings.force.start();
            }
            return this.outputGraph$.asObservable();
        };
        ColaForceDirectedLayout.prototype.internalGraphToOutputGraph = function (internalGraph) {
            var _this = this;
            this.outputGraph.nodes = internalGraph.nodes.map(function (node) { return (Object.assign(Object.assign({}, node), { id: node.id || id(), position: {
                    x: node.x,
                    y: node.y
                }, dimension: {
                    width: (node.dimension && node.dimension.width) || 20,
                    height: (node.dimension && node.dimension.height) || 20
                }, transform: "translate(" + (node.x - ((node.dimension && node.dimension.width) || 20) / 2 || 0) + ", " + (node.y - ((node.dimension && node.dimension.height) || 20) / 2 || 0) + ")" })); });
            this.outputGraph.edges = internalGraph.links
                .map(function (edge) {
                var source = toNode(internalGraph.nodes, edge.source);
                var target = toNode(internalGraph.nodes, edge.target);
                return Object.assign(Object.assign({}, edge), { source: source.id, target: target.id, points: [
                        source.bounds.rayIntersection(target.bounds.cx(), target.bounds.cy()),
                        target.bounds.rayIntersection(source.bounds.cx(), source.bounds.cy())
                    ] });
            })
                .concat(internalGraph.groupLinks.map(function (groupLink) {
                var sourceNode = internalGraph.nodes.find(function (foundNode) { return foundNode.id === groupLink.source; });
                var targetNode = internalGraph.nodes.find(function (foundNode) { return foundNode.id === groupLink.target; });
                var source = sourceNode || internalGraph.groups.find(function (foundGroup) { return foundGroup.id === groupLink.source; });
                var target = targetNode || internalGraph.groups.find(function (foundGroup) { return foundGroup.id === groupLink.target; });
                return Object.assign(Object.assign({}, groupLink), { source: source.id, target: target.id, points: [
                        source.bounds.rayIntersection(target.bounds.cx(), target.bounds.cy()),
                        target.bounds.rayIntersection(source.bounds.cx(), source.bounds.cy())
                    ] });
            }));
            this.outputGraph.clusters = internalGraph.groups.map(function (group, index) {
                var inputGroup = _this.inputGraph.clusters[index];
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
        };
        ColaForceDirectedLayout.prototype.onDragStart = function (draggingNode, $event) {
            var nodeIndex = this.outputGraph.nodes.findIndex(function (foundNode) { return foundNode.id === draggingNode.id; });
            var node = this.internalGraph.nodes[nodeIndex];
            if (!node) {
                return;
            }
            this.draggingStart = { x: node.x - $event.x, y: node.y - $event.y };
            node.fixed = 1;
            this.settings.force.start();
        };
        ColaForceDirectedLayout.prototype.onDrag = function (draggingNode, $event) {
            if (!draggingNode) {
                return;
            }
            var nodeIndex = this.outputGraph.nodes.findIndex(function (foundNode) { return foundNode.id === draggingNode.id; });
            var node = this.internalGraph.nodes[nodeIndex];
            if (!node) {
                return;
            }
            node.x = this.draggingStart.x + $event.x;
            node.y = this.draggingStart.y + $event.y;
        };
        ColaForceDirectedLayout.prototype.onDragEnd = function (draggingNode, $event) {
            if (!draggingNode) {
                return;
            }
            var nodeIndex = this.outputGraph.nodes.findIndex(function (foundNode) { return foundNode.id === draggingNode.id; });
            var node = this.internalGraph.nodes[nodeIndex];
            if (!node) {
                return;
            }
            node.fixed = 0;
        };
        return ColaForceDirectedLayout;
    }());

    var layouts = {
        dagre: DagreLayout,
        dagreCluster: DagreClusterLayout,
        dagreNodesOnly: DagreNodesOnlyLayout,
        d3ForceDirected: D3ForceDirectedLayout,
        colaForceDirected: ColaForceDirectedLayout
    };
    var LayoutService = /** @class */ (function () {
        function LayoutService() {
        }
        LayoutService.prototype.getLayout = function (name) {
            if (layouts[name]) {
                return new layouts[name]();
            }
            else {
                throw new Error("Unknown layout type '" + name + "'");
            }
        };
        return LayoutService;
    }());
    LayoutService.decorators = [
        { type: core.Injectable }
    ];

    exports.PanningAxis = void 0;
    (function (PanningAxis) {
        PanningAxis["Both"] = "both";
        PanningAxis["Horizontal"] = "horizontal";
        PanningAxis["Vertical"] = "vertical";
    })(exports.PanningAxis || (exports.PanningAxis = {}));

    exports.MiniMapPosition = void 0;
    (function (MiniMapPosition) {
        MiniMapPosition["UpperLeft"] = "UpperLeft";
        MiniMapPosition["UpperRight"] = "UpperRight";
    })(exports.MiniMapPosition || (exports.MiniMapPosition = {}));

    /**
     * Throttle a function
     *
     * @export
     * @param {*}      func
     * @param {number} wait
     * @param {*}      [options]
     * @returns
     */
    function throttle(func, wait, options) {
        options = options || {};
        var context;
        var args;
        var result;
        var timeout = null;
        var previous = 0;
        function later() {
            previous = options.leading === false ? 0 : +new Date();
            timeout = null;
            result = func.apply(context, args);
        }
        return function () {
            var now = +new Date();
            if (!previous && options.leading === false) {
                previous = now;
            }
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0) {
                clearTimeout(timeout);
                timeout = null;
                previous = now;
                result = func.apply(context, args);
            }
            else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    }
    /**
     * Throttle decorator
     *
     *  class MyClass {
     *    throttleable(10)
     *    myFn() { ... }
     *  }
     *
     * @export
     * @param {number} duration
     * @param {*} [options]
     * @returns
     */
    function throttleable(duration, options) {
        return function innerDecorator(target, key, descriptor) {
            return {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: function getter() {
                    Object.defineProperty(this, key, {
                        configurable: true,
                        enumerable: descriptor.enumerable,
                        value: throttle(descriptor.value, duration, options)
                    });
                    return this[key];
                }
            };
        };
    }

    var colorSets = [
        {
            name: 'vivid',
            selectable: true,
            group: 'Ordinal',
            domain: [
                '#647c8a',
                '#3f51b5',
                '#2196f3',
                '#00b862',
                '#afdf0a',
                '#a7b61a',
                '#f3e562',
                '#ff9800',
                '#ff5722',
                '#ff4514'
            ]
        },
        {
            name: 'natural',
            selectable: true,
            group: 'Ordinal',
            domain: [
                '#bf9d76',
                '#e99450',
                '#d89f59',
                '#f2dfa7',
                '#a5d7c6',
                '#7794b1',
                '#afafaf',
                '#707160',
                '#ba9383',
                '#d9d5c3'
            ]
        },
        {
            name: 'cool',
            selectable: true,
            group: 'Ordinal',
            domain: [
                '#a8385d',
                '#7aa3e5',
                '#a27ea8',
                '#aae3f5',
                '#adcded',
                '#a95963',
                '#8796c0',
                '#7ed3ed',
                '#50abcc',
                '#ad6886'
            ]
        },
        {
            name: 'fire',
            selectable: true,
            group: 'Ordinal',
            domain: ['#ff3d00', '#bf360c', '#ff8f00', '#ff6f00', '#ff5722', '#e65100', '#ffca28', '#ffab00']
        },
        {
            name: 'solar',
            selectable: true,
            group: 'Continuous',
            domain: [
                '#fff8e1',
                '#ffecb3',
                '#ffe082',
                '#ffd54f',
                '#ffca28',
                '#ffc107',
                '#ffb300',
                '#ffa000',
                '#ff8f00',
                '#ff6f00'
            ]
        },
        {
            name: 'air',
            selectable: true,
            group: 'Continuous',
            domain: [
                '#e1f5fe',
                '#b3e5fc',
                '#81d4fa',
                '#4fc3f7',
                '#29b6f6',
                '#03a9f4',
                '#039be5',
                '#0288d1',
                '#0277bd',
                '#01579b'
            ]
        },
        {
            name: 'aqua',
            selectable: true,
            group: 'Continuous',
            domain: [
                '#e0f7fa',
                '#b2ebf2',
                '#80deea',
                '#4dd0e1',
                '#26c6da',
                '#00bcd4',
                '#00acc1',
                '#0097a7',
                '#00838f',
                '#006064'
            ]
        },
        {
            name: 'flame',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#A10A28',
                '#D3342D',
                '#EF6D49',
                '#FAAD67',
                '#FDDE90',
                '#DBED91',
                '#A9D770',
                '#6CBA67',
                '#2C9653',
                '#146738'
            ]
        },
        {
            name: 'ocean',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#1D68FB',
                '#33C0FC',
                '#4AFFFE',
                '#AFFFFF',
                '#FFFC63',
                '#FDBD2D',
                '#FC8A25',
                '#FA4F1E',
                '#FA141B',
                '#BA38D1'
            ]
        },
        {
            name: 'forest',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#55C22D',
                '#C1F33D',
                '#3CC099',
                '#AFFFFF',
                '#8CFC9D',
                '#76CFFA',
                '#BA60FB',
                '#EE6490',
                '#C42A1C',
                '#FC9F32'
            ]
        },
        {
            name: 'horizon',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#2597FB',
                '#65EBFD',
                '#99FDD0',
                '#FCEE4B',
                '#FEFCFA',
                '#FDD6E3',
                '#FCB1A8',
                '#EF6F7B',
                '#CB96E8',
                '#EFDEE0'
            ]
        },
        {
            name: 'neons',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#FF3333',
                '#FF33FF',
                '#CC33FF',
                '#0000FF',
                '#33CCFF',
                '#33FFFF',
                '#33FF66',
                '#CCFF33',
                '#FFCC00',
                '#FF6600'
            ]
        },
        {
            name: 'picnic',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#FAC51D',
                '#66BD6D',
                '#FAA026',
                '#29BB9C',
                '#E96B56',
                '#55ACD2',
                '#B7332F',
                '#2C83C9',
                '#9166B8',
                '#92E7E8'
            ]
        },
        {
            name: 'night',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#2B1B5A',
                '#501356',
                '#183356',
                '#28203F',
                '#391B3C',
                '#1E2B3C',
                '#120634',
                '#2D0432',
                '#051932',
                '#453080',
                '#75267D',
                '#2C507D',
                '#4B3880',
                '#752F7D',
                '#35547D'
            ]
        },
        {
            name: 'nightLights',
            selectable: false,
            group: 'Ordinal',
            domain: [
                '#4e31a5',
                '#9c25a7',
                '#3065ab',
                '#57468b',
                '#904497',
                '#46648b',
                '#32118d',
                '#a00fb3',
                '#1052a2',
                '#6e51bd',
                '#b63cc3',
                '#6c97cb',
                '#8671c1',
                '#b455be',
                '#7496c3'
            ]
        }
    ];

    var ColorHelper = /** @class */ (function () {
        function ColorHelper(scheme, domain, customColors) {
            if (typeof scheme === 'string') {
                scheme = colorSets.find(function (cs) {
                    return cs.name === scheme;
                });
            }
            this.colorDomain = scheme.domain;
            this.domain = domain;
            this.customColors = customColors;
            this.scale = this.generateColorScheme(scheme, this.domain);
        }
        ColorHelper.prototype.generateColorScheme = function (scheme, domain) {
            if (typeof scheme === 'string') {
                scheme = colorSets.find(function (cs) {
                    return cs.name === scheme;
                });
            }
            return d3Scale.scaleOrdinal().range(scheme.domain).domain(domain);
        };
        ColorHelper.prototype.getColor = function (value) {
            if (value === undefined || value === null) {
                throw new Error('Value can not be null');
            }
            if (typeof this.customColors === 'function') {
                return this.customColors(value);
            }
            var formattedValue = value.toString();
            var found; // todo type customColors
            if (this.customColors && this.customColors.length > 0) {
                found = this.customColors.find(function (mapping) {
                    return mapping.name.toLowerCase() === formattedValue.toLowerCase();
                });
            }
            if (found) {
                return found.value;
            }
            else {
                return this.scale(value);
            }
        };
        return ColorHelper;
    }());

    function calculateViewDimensions(_a) {
        var width = _a.width, height = _a.height;
        var chartWidth = width;
        var chartHeight = height;
        chartWidth = Math.max(0, chartWidth);
        chartHeight = Math.max(0, chartHeight);
        return {
            width: Math.floor(chartWidth),
            height: Math.floor(chartHeight)
        };
    }

    /**
     * Visibility Observer
     */
    var VisibilityObserver = /** @class */ (function () {
        function VisibilityObserver(element, zone) {
            this.element = element;
            this.zone = zone;
            this.visible = new core.EventEmitter();
            this.isVisible = false;
            this.runCheck();
        }
        VisibilityObserver.prototype.destroy = function () {
            clearTimeout(this.timeout);
        };
        VisibilityObserver.prototype.onVisibilityChange = function () {
            var _this = this;
            // trigger zone recalc for columns
            this.zone.run(function () {
                _this.isVisible = true;
                _this.visible.emit(true);
            });
        };
        VisibilityObserver.prototype.runCheck = function () {
            var _this = this;
            var check = function () {
                if (!_this.element) {
                    return;
                }
                // https://davidwalsh.name/offsetheight-visibility
                var _a = _this.element.nativeElement, offsetHeight = _a.offsetHeight, offsetWidth = _a.offsetWidth;
                if (offsetHeight && offsetWidth) {
                    clearTimeout(_this.timeout);
                    _this.onVisibilityChange();
                }
                else {
                    clearTimeout(_this.timeout);
                    _this.zone.runOutsideAngular(function () {
                        _this.timeout = setTimeout(function () { return check(); }, 100);
                    });
                }
            };
            this.zone.runOutsideAngular(function () {
                _this.timeout = setTimeout(function () { return check(); });
            });
        };
        return VisibilityObserver;
    }());
    VisibilityObserver.decorators = [
        { type: core.Directive, args: [{
                    // tslint:disable-next-line:directive-selector
                    selector: 'visibility-observer'
                },] }
    ];
    VisibilityObserver.ctorParameters = function () { return [
        { type: core.ElementRef },
        { type: core.NgZone }
    ]; };
    VisibilityObserver.propDecorators = {
        visible: [{ type: core.Output }]
    };

    var GraphComponent = /** @class */ (function () {
        function GraphComponent(el, zone, cd, layoutService) {
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
            this.panningAxis = exports.PanningAxis.Both;
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
            this.miniMapPosition = exports.MiniMapPosition.UpperRight;
            this.scheme = 'cool';
            this.animations = true;
            this.select = new core.EventEmitter();
            this.activate = new core.EventEmitter();
            this.deactivate = new core.EventEmitter();
            this.zoomChange = new core.EventEmitter();
            this.clickHandler = new core.EventEmitter();
            this.isMouseMoveCalled = false;
            this.graphSubscription = new rxjs.Subscription();
            this.subscriptions = [];
            this.isPanning = false;
            this.isDragging = false;
            this.initialized = false;
            this.graphDims = { width: 0, height: 0 };
            this._oldLinks = [];
            this.oldNodes = new Set();
            this.oldClusters = new Set();
            this.transformationMatrix = transformationMatrix.identity();
            this._touchLastX = null;
            this._touchLastY = null;
            this.minimapScaleCoefficient = 3;
            this.minimapOffsetX = 0;
            this.minimapOffsetY = 0;
            this.isMinimapPanning = false;
            this.groupResultsBy = function (node) { return node.label; };
        }
        Object.defineProperty(GraphComponent.prototype, "zoomLevel", {
            /**
             * Get the current zoom level
             */
            get: function () {
                return this.transformationMatrix.a;
            },
            /**
             * Set the current zoom level
             */
            set: function (level) {
                this.zoomTo(Number(level));
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GraphComponent.prototype, "panOffsetX", {
            /**
             * Get the current `x` position of the graph
             */
            get: function () {
                return this.transformationMatrix.e;
            },
            /**
             * Set the current `x` position of the graph
             */
            set: function (x) {
                this.panTo(Number(x), null);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(GraphComponent.prototype, "panOffsetY", {
            /**
             * Get the current `y` position of the graph
             */
            get: function () {
                return this.transformationMatrix.f;
            },
            /**
             * Set the current `y` position of the graph
             */
            set: function (y) {
                this.panTo(null, Number(y));
            },
            enumerable: false,
            configurable: true
        });
        /**
         * Angular lifecycle event
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.ngOnInit = function () {
            var _this = this;
            if (this.update$) {
                this.subscriptions.push(this.update$.subscribe(function () {
                    _this.update();
                }));
            }
            if (this.center$) {
                this.subscriptions.push(this.center$.subscribe(function () {
                    _this.center();
                }));
            }
            if (this.zoomToFit$) {
                this.subscriptions.push(this.zoomToFit$.subscribe(function () {
                    _this.zoomToFit();
                }));
            }
            if (this.panToNode$) {
                this.subscriptions.push(this.panToNode$.subscribe(function (nodeId) {
                    _this.panToNodeId(nodeId);
                }));
            }
            this.minimapClipPathId = "minimapClip" + id();
        };
        GraphComponent.prototype.ngOnChanges = function (changes) {
            this.basicUpdate();
            var layout = changes.layout, layoutSettings = changes.layoutSettings, nodes = changes.nodes, clusters = changes.clusters, links = changes.links;
            this.setLayout(this.layout);
            if (layoutSettings) {
                this.setLayoutSettings(this.layoutSettings);
            }
            this.update();
        };
        GraphComponent.prototype.setLayout = function (layout) {
            this.initialized = false;
            if (!layout) {
                layout = 'dagre';
            }
            if (typeof layout === 'string') {
                this.layout = this.layoutService.getLayout(layout);
                this.setLayoutSettings(this.layoutSettings);
            }
        };
        GraphComponent.prototype.setLayoutSettings = function (settings) {
            if (this.layout && typeof this.layout !== 'string') {
                this.layout.settings = settings;
            }
        };
        /**
         * Angular lifecycle event
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.ngOnDestroy = function () {
            var e_1, _c;
            this.unbindEvents();
            if (this.visibilityObserver) {
                this.visibilityObserver.visible.unsubscribe();
                this.visibilityObserver.destroy();
            }
            try {
                for (var _d = __values(this.subscriptions), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var sub = _e.value;
                    sub.unsubscribe();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.subscriptions = null;
        };
        /**
         * Angular lifecycle event
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.ngAfterViewInit = function () {
            var _this = this;
            this.bindWindowResizeEvent();
            // listen for visibility of the element for hidden by default scenario
            this.visibilityObserver = new VisibilityObserver(this.el, this.zone);
            this.visibilityObserver.visible.subscribe(this.update.bind(this));
            setTimeout(function () { return _this.update(); });
        };
        /**
         * Base class update implementation for the dag graph
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.update = function () {
            var _this = this;
            this.basicUpdate();
            if (!this.curve) {
                this.curve = shape__namespace.curveBundle.beta(1);
            }
            this.zone.run(function () {
                _this.dims = calculateViewDimensions({
                    width: _this.width,
                    height: _this.height
                });
                _this.seriesDomain = _this.getSeriesDomain();
                _this.setColors();
                _this.createGraph();
                _this.updateTransform();
                _this.initialized = true;
            });
        };
        /**
         * Creates the dagre graph engine
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.createGraph = function () {
            var _this = this;
            this.graphSubscription.unsubscribe();
            this.graphSubscription = new rxjs.Subscription();
            var initializeNode = function (n) {
                if (!n.meta) {
                    n.meta = {};
                }
                if (!n.id) {
                    n.id = id();
                }
                if (!n.dimension) {
                    n.dimension = {
                        width: _this.nodeWidth ? _this.nodeWidth : 30,
                        height: _this.nodeHeight ? _this.nodeHeight : 30
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
                nodes: this.nodes.length > 0 ? __spreadArray([], __read(this.nodes)).map(initializeNode) : [],
                clusters: this.clusters && this.clusters.length > 0 ? __spreadArray([], __read(this.clusters)).map(initializeNode) : [],
                edges: this.links.length > 0
                    ? __spreadArray([], __read(this.links)).map(function (e) {
                        if (!e.id) {
                            e.id = id();
                        }
                        return e;
                    })
                    : []
            };
            requestAnimationFrame(function () { return _this.draw(); });
        };
        /**
         * Draws the graph using dagre layouts
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.draw = function () {
            var _this = this;
            if (!this.layout || typeof this.layout === 'string') {
                return;
            }
            // Calc view dims for the nodes
            this.applyNodeDimensions();
            // Recalc the layout
            var result = this.layout.run(this.graph);
            var result$ = result instanceof rxjs.Observable ? result : rxjs.of(result);
            this.graphSubscription.add(result$.subscribe(function (graph) {
                _this.graph = graph;
                _this.tick();
            }));
            if (this.graph.nodes.length === 0) {
                return;
            }
            result$.pipe(operators.first()).subscribe(function () { return _this.applyNodeDimensions(); });
        };
        GraphComponent.prototype.tick = function () {
            var _this = this;
            // Transposes view options to the node
            var oldNodes = new Set();
            this.graph.nodes.map(function (n) {
                n.transform = "translate(" + (n.position.x - n.dimension.width / 2 || 0) + ", " + (n.position.y - n.dimension.height / 2 || 0) + ")";
                if (!n.data) {
                    n.data = {};
                }
                n.data.color = _this.colors.getColor(_this.groupResultsBy(n));
                oldNodes.add(n.id);
            });
            var oldClusters = new Set();
            (this.graph.clusters || []).map(function (n) {
                n.transform = "translate(" + (n.position.x - n.dimension.width / 2 || 0) + ", " + (n.position.y - n.dimension.height / 2 || 0) + ")";
                if (!n.data) {
                    n.data = {};
                }
                n.data.color = _this.colors.getColor(_this.groupResultsBy(n));
                oldClusters.add(n.id);
            });
            // Prevent animations on new nodes
            setTimeout(function () {
                _this.oldNodes = oldNodes;
                _this.oldClusters = oldClusters;
            }, 500);
            // Update the labels to the new positions
            var newLinks = [];
            var _loop_1 = function (edgeLabelId) {
                var edgeLabel = this_1.graph.edgeLabels[edgeLabelId];
                var normKey = edgeLabelId.replace(/[^\w-]*/g, '');
                var isMultigraph = this_1.layout && typeof this_1.layout !== 'string' && this_1.layout.settings && this_1.layout.settings.multigraph;
                var oldLink = isMultigraph
                    ? this_1._oldLinks.find(function (ol) { return "" + ol.source + ol.target + ol.id === normKey; })
                    : this_1._oldLinks.find(function (ol) { return "" + ol.source + ol.target === normKey; });
                var linkFromGraph = isMultigraph
                    ? this_1.graph.edges.find(function (nl) { return "" + nl.source + nl.target + nl.id === normKey; })
                    : this_1.graph.edges.find(function (nl) { return "" + nl.source + nl.target === normKey; });
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
                var points = edgeLabel.points;
                var line = this_1.generateLine(points);
                var newLink = Object.assign({}, oldLink);
                newLink.line = line;
                newLink.points = points;
                this_1.updateMidpointOnEdge(newLink, points);
                var textPos = points[Math.floor(points.length / 2)];
                if (textPos) {
                    newLink.textTransform = "translate(" + (textPos.x || 0) + "," + (textPos.y || 0) + ")";
                }
                newLink.textAngle = 0;
                if (!newLink.oldLine) {
                    newLink.oldLine = newLink.line;
                }
                this_1.calcDominantBaseline(newLink);
                newLinks.push(newLink);
            };
            var this_1 = this;
            for (var edgeLabelId in this.graph.edgeLabels) {
                _loop_1(edgeLabelId);
            }
            this.graph.edges = newLinks;
            // Map the old links for animations
            if (this.graph.edges) {
                this._oldLinks = this.graph.edges.map(function (l) {
                    var newL = Object.assign({}, l);
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
            requestAnimationFrame(function () { return _this.redrawLines(); });
            this.cd.markForCheck();
        };
        GraphComponent.prototype.getMinimapTransform = function () {
            switch (this.miniMapPosition) {
                case exports.MiniMapPosition.UpperLeft: {
                    return '';
                }
                case exports.MiniMapPosition.UpperRight: {
                    return 'translate(' + (this.dims.width - this.graphDims.width / this.minimapScaleCoefficient) + ',' + 0 + ')';
                }
                default: {
                    return '';
                }
            }
        };
        GraphComponent.prototype.updateGraphDims = function () {
            var minX = +Infinity;
            var maxX = -Infinity;
            var minY = +Infinity;
            var maxY = -Infinity;
            for (var i = 0; i < this.graph.nodes.length; i++) {
                var node = this.graph.nodes[i];
                minX = node.position.x < minX ? node.position.x : minX;
                minY = node.position.y < minY ? node.position.y : minY;
                maxX = node.position.x + node.dimension.width > maxX ? node.position.x + node.dimension.width : maxX;
                maxY = node.position.y + node.dimension.height > maxY ? node.position.y + node.dimension.height : maxY;
            }
            if (this.showMiniMap) {
                minX -= 100;
                minY -= 100;
                maxX += 100;
                maxY += 100;
            }
            this.graphDims.width = maxX - minX;
            this.graphDims.height = maxY - minY;
            this.minimapOffsetX = minX;
            this.minimapOffsetY = minY;
        };
        GraphComponent.prototype.updateMinimap = function () {
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
        };
        /**
         * Measures the node element and applies the dimensions
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.applyNodeDimensions = function () {
            var _this = this;
            if (this.nodeElements && this.nodeElements.length) {
                this.nodeElements.map(function (elem) {
                    var e_2, _c;
                    var nativeElement = elem.nativeElement;
                    var node = _this.graph.nodes.find(function (n) { return n.id === nativeElement.id; });
                    if (!node) {
                        return;
                    }
                    // calculate the height
                    var dims;
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
                    if (_this.nodeHeight) {
                        node.dimension.height =
                            node.dimension.height && node.meta.forceDimensions ? node.dimension.height : _this.nodeHeight;
                    }
                    else {
                        node.dimension.height =
                            node.dimension.height && node.meta.forceDimensions ? node.dimension.height : dims.height;
                    }
                    if (_this.nodeMaxHeight) {
                        node.dimension.height = Math.max(node.dimension.height, _this.nodeMaxHeight);
                    }
                    if (_this.nodeMinHeight) {
                        node.dimension.height = Math.min(node.dimension.height, _this.nodeMinHeight);
                    }
                    if (_this.nodeWidth) {
                        node.dimension.width =
                            node.dimension.width && node.meta.forceDimensions ? node.dimension.width : _this.nodeWidth;
                    }
                    else {
                        // calculate the width
                        if (nativeElement.getElementsByTagName('text').length) {
                            var maxTextDims = void 0;
                            try {
                                try {
                                    for (var _d = __values(nativeElement.getElementsByTagName('text')), _e = _d.next(); !_e.done; _e = _d.next()) {
                                        var textElem = _e.value;
                                        var currentBBox = textElem.getBBox();
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
                                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                                finally {
                                    try {
                                        if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                                    }
                                    finally { if (e_2) throw e_2.error; }
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
                    if (_this.nodeMaxWidth) {
                        node.dimension.width = Math.max(node.dimension.width, _this.nodeMaxWidth);
                    }
                    if (_this.nodeMinWidth) {
                        node.dimension.width = Math.min(node.dimension.width, _this.nodeMinWidth);
                    }
                });
            }
        };
        /**
         * Redraws the lines when dragged or viewport updated
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.redrawLines = function (_animate) {
            var _this = this;
            if (_animate === void 0) { _animate = this.animate; }
            this.linkElements.map(function (linkEl) {
                var edge = _this.graph.edges.find(function (lin) { return lin.id === linkEl.nativeElement.id; });
                if (edge) {
                    var linkSelection = d3Selection.select(linkEl.nativeElement).select('.line');
                    linkSelection
                        .attr('d', edge.oldLine)
                        .transition()
                        .ease(ease__namespace.easeSinInOut)
                        .duration(_animate ? 500 : 0)
                        .attr('d', edge.line);
                    var textPathSelection = d3Selection.select(_this.el.nativeElement).select("#" + edge.id);
                    textPathSelection
                        .attr('d', edge.oldTextPath)
                        .transition()
                        .ease(ease__namespace.easeSinInOut)
                        .duration(_animate ? 500 : 0)
                        .attr('d', edge.textPath);
                    _this.updateMidpointOnEdge(edge, edge.points);
                }
            });
        };
        /**
         * Calculate the text directions / flipping
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.calcDominantBaseline = function (link) {
            var firstPoint = link.points[0];
            var lastPoint = link.points[link.points.length - 1];
            link.oldTextPath = link.textPath;
            if (lastPoint.x < firstPoint.x) {
                link.dominantBaseline = 'text-before-edge';
                // reverse text path for when its flipped upside down
                link.textPath = this.generateLine(__spreadArray([], __read(link.points)).reverse());
            }
            else {
                link.dominantBaseline = 'text-after-edge';
                link.textPath = link.line;
            }
        };
        /**
         * Generate the new line path
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.generateLine = function (points) {
            var lineFunction = shape__namespace
                .line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .curve(this.curve);
            return lineFunction(points);
        };
        /**
         * Zoom was invoked from event
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onZoom = function ($event, direction) {
            if (this.enableTrackpadSupport && !$event.ctrlKey) {
                this.pan($event.deltaX * -1, $event.deltaY * -1);
                return;
            }
            var zoomFactor = 1 + (direction === 'in' ? this.zoomSpeed : -this.zoomSpeed);
            // Check that zooming wouldn't put us out of bounds
            var newZoomLevel = this.zoomLevel * zoomFactor;
            if (newZoomLevel <= this.minZoomLevel || newZoomLevel >= this.maxZoomLevel) {
                return;
            }
            // Check if zooming is enabled or not
            if (!this.enableZoom) {
                return;
            }
            if (this.panOnZoom === true && $event) {
                // Absolute mouse X/Y on the screen
                var mouseX = $event.clientX;
                var mouseY = $event.clientY;
                // Transform the mouse X/Y into a SVG X/Y
                var svg = this.el.nativeElement.querySelector('svg');
                var svgGroup = svg.querySelector('g.chart');
                var point = svg.createSVGPoint();
                point.x = mouseX;
                point.y = mouseY;
                var svgPoint = point.matrixTransform(svgGroup.getScreenCTM().inverse());
                // Panzoom
                this.pan(svgPoint.x, svgPoint.y, true);
                this.zoom(zoomFactor);
                this.pan(-svgPoint.x, -svgPoint.y, true);
            }
            else {
                this.zoom(zoomFactor);
            }
        };
        /**
         * Pan by x/y
         *
         * @param x
         * @param y
         */
        GraphComponent.prototype.pan = function (x, y, ignoreZoomLevel) {
            if (ignoreZoomLevel === void 0) { ignoreZoomLevel = false; }
            var zoomLevel = ignoreZoomLevel ? 1 : this.zoomLevel;
            this.transformationMatrix = transformationMatrix.transform(this.transformationMatrix, transformationMatrix.translate(x / zoomLevel, y / zoomLevel));
            this.updateTransform();
        };
        /**
         * Pan to a fixed x/y
         *
         */
        GraphComponent.prototype.panTo = function (x, y) {
            if (x === null || x === undefined || isNaN(x) || y === null || y === undefined || isNaN(y)) {
                return;
            }
            var panX = -this.panOffsetX - x * this.zoomLevel + this.dims.width / 2;
            var panY = -this.panOffsetY - y * this.zoomLevel + this.dims.height / 2;
            this.transformationMatrix = transformationMatrix.transform(this.transformationMatrix, transformationMatrix.translate(panX / this.zoomLevel, panY / this.zoomLevel));
            this.updateTransform();
        };
        /**
         * Zoom by a factor
         *
         */
        GraphComponent.prototype.zoom = function (factor) {
            this.transformationMatrix = transformationMatrix.transform(this.transformationMatrix, transformationMatrix.scale(factor, factor));
            this.zoomChange.emit(this.zoomLevel);
            this.updateTransform();
        };
        /**
         * Zoom to a fixed level
         *
         */
        GraphComponent.prototype.zoomTo = function (level) {
            this.transformationMatrix.a = isNaN(level) ? this.transformationMatrix.a : Number(level);
            this.transformationMatrix.d = isNaN(level) ? this.transformationMatrix.d : Number(level);
            this.zoomChange.emit(this.zoomLevel);
            this.updateTransform();
            this.update();
        };
        /**
         * Drag was invoked from an event
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onDrag = function (event) {
            var e_3, _c;
            var _this = this;
            if (!this.draggingEnabled) {
                return;
            }
            var node = this.draggingNode;
            if (this.layout && typeof this.layout !== 'string' && this.layout.onDrag) {
                this.layout.onDrag(node, event);
            }
            node.position.x += event.movementX / this.zoomLevel;
            node.position.y += event.movementY / this.zoomLevel;
            // move the node
            var x = node.position.x - node.dimension.width / 2;
            var y = node.position.y - node.dimension.height / 2;
            node.transform = "translate(" + x + ", " + y + ")";
            var _loop_2 = function (link) {
                if (link.target === node.id ||
                    link.source === node.id ||
                    link.target.id === node.id ||
                    link.source.id === node.id) {
                    if (this_2.layout && typeof this_2.layout !== 'string') {
                        var result = this_2.layout.updateEdge(this_2.graph, link);
                        var result$ = result instanceof rxjs.Observable ? result : rxjs.of(result);
                        this_2.graphSubscription.add(result$.subscribe(function (graph) {
                            _this.graph = graph;
                            _this.redrawEdge(link);
                        }));
                    }
                }
            };
            var this_2 = this;
            try {
                for (var _d = __values(this.graph.edges), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var link = _e.value;
                    _loop_2(link);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.redrawLines(false);
            this.updateMinimap();
        };
        GraphComponent.prototype.redrawEdge = function (edge) {
            var line = this.generateLine(edge.points);
            this.calcDominantBaseline(edge);
            edge.oldLine = edge.line;
            edge.line = line;
        };
        /**
         * Update the entire view for the new pan position
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.updateTransform = function () {
            this.transform = transformationMatrix.toSVG(transformationMatrix.smoothMatrix(this.transformationMatrix, 100));
        };
        /**
         * Node was clicked
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onClick = function (event) {
            this.select.emit(event);
        };
        /**
         * Node was focused
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onActivate = function (event) {
            if (this.activeEntries.indexOf(event) > -1) {
                return;
            }
            this.activeEntries = __spreadArray([event], __read(this.activeEntries));
            this.activate.emit({ value: event, entries: this.activeEntries });
        };
        /**
         * Node was defocused
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onDeactivate = function (event) {
            var idx = this.activeEntries.indexOf(event);
            this.activeEntries.splice(idx, 1);
            this.activeEntries = __spreadArray([], __read(this.activeEntries));
            this.deactivate.emit({ value: event, entries: this.activeEntries });
        };
        /**
         * Get the domain series for the nodes
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.getSeriesDomain = function () {
            var _this = this;
            return this.nodes
                .map(function (d) { return _this.groupResultsBy(d); })
                .reduce(function (nodes, node) { return (nodes.indexOf(node) !== -1 ? nodes : nodes.concat([node])); }, [])
                .sort();
        };
        /**
         * Tracking for the link
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.trackLinkBy = function (index, link) {
            return link.id;
        };
        /**
         * Tracking for the node
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.trackNodeBy = function (index, node) {
            return node.id;
        };
        /**
         * Sets the colors the nodes
         *
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.setColors = function () {
            this.colors = new ColorHelper(this.scheme, this.seriesDomain, this.customColors);
        };
        /**
         * On mouse move event, used for panning and dragging.
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onMouseMove = function ($event) {
            this.isMouseMoveCalled = true;
            if ((this.isPanning || this.isMinimapPanning) && this.panningEnabled) {
                this.panWithConstraints(this.panningAxis, $event);
            }
            else if (this.isDragging && this.draggingEnabled) {
                this.onDrag($event);
            }
        };
        GraphComponent.prototype.onMouseDown = function (event) {
            this.isMouseMoveCalled = false;
        };
        GraphComponent.prototype.graphClick = function (event) {
            if (!this.isMouseMoveCalled)
                this.clickHandler.emit(event);
        };
        /**
         * On touch start event to enable panning.
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onTouchStart = function (event) {
            this._touchLastX = event.changedTouches[0].clientX;
            this._touchLastY = event.changedTouches[0].clientY;
            this.isPanning = true;
        };
        /**
         * On touch move event, used for panning.
         *
         */
        GraphComponent.prototype.onTouchMove = function ($event) {
            if (this.isPanning && this.panningEnabled) {
                var clientX = $event.changedTouches[0].clientX;
                var clientY = $event.changedTouches[0].clientY;
                var movementX = clientX - this._touchLastX;
                var movementY = clientY - this._touchLastY;
                this._touchLastX = clientX;
                this._touchLastY = clientY;
                this.pan(movementX, movementY);
            }
        };
        /**
         * On touch end event to disable panning.
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onTouchEnd = function (event) {
            this.isPanning = false;
        };
        /**
         * On mouse up event to disable panning/dragging.
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onMouseUp = function (event) {
            this.isDragging = false;
            this.isPanning = false;
            this.isMinimapPanning = false;
            if (this.layout && typeof this.layout !== 'string' && this.layout.onDragEnd) {
                this.layout.onDragEnd(this.draggingNode, event);
            }
        };
        /**
         * On node mouse down to kick off dragging
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onNodeMouseDown = function (event, node) {
            if (!this.draggingEnabled) {
                return;
            }
            this.isDragging = true;
            this.draggingNode = node;
            if (this.layout && typeof this.layout !== 'string' && this.layout.onDragStart) {
                this.layout.onDragStart(node, event);
            }
        };
        /**
         * On minimap drag mouse down to kick off minimap panning
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onMinimapDragMouseDown = function () {
            this.isMinimapPanning = true;
        };
        /**
         * On minimap pan event. Pans the graph to the clicked position
         *
         * @memberOf GraphComponent
         */
        GraphComponent.prototype.onMinimapPanTo = function (event) {
            var x = event.offsetX - (this.dims.width - (this.graphDims.width + this.minimapOffsetX) / this.minimapScaleCoefficient);
            var y = event.offsetY + this.minimapOffsetY / this.minimapScaleCoefficient;
            this.panTo(x * this.minimapScaleCoefficient, y * this.minimapScaleCoefficient);
            this.isMinimapPanning = true;
        };
        /**
         * Center the graph in the viewport
         */
        GraphComponent.prototype.center = function () {
            this.panTo(this.graphDims.width / 2, this.graphDims.height / 2);
        };
        /**
         * Zooms to fit the entier graph
         */
        GraphComponent.prototype.zoomToFit = function () {
            var _a, _b;
            var margin = {
                x: ((_a = this.zoomToFitMargin) === null || _a === void 0 ? void 0 : _a.x) || 0,
                y: ((_b = this.zoomToFitMargin) === null || _b === void 0 ? void 0 : _b.y) || 0,
            };
            // Margin value is x2 for top/bottom and left/right
            var heightZoom = this.dims.height / (this.graphDims.height + margin.y * 2);
            var widthZoom = this.dims.width / (this.graphDims.width + margin.x * 2);
            var zoomLevel = Math.min(heightZoom, widthZoom, 1);
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
        };
        /**
         * Pans to the node
         * @param nodeId
         */
        GraphComponent.prototype.panToNodeId = function (nodeId) {
            var node = this.graph.nodes.find(function (n) { return n.id === nodeId; });
            if (!node) {
                return;
            }
            this.panTo(node.position.x, node.position.y);
        };
        GraphComponent.prototype.panWithConstraints = function (key, event) {
            var x = event.movementX;
            var y = event.movementY;
            if (this.isMinimapPanning) {
                x = -this.minimapScaleCoefficient * x * this.zoomLevel;
                y = -this.minimapScaleCoefficient * y * this.zoomLevel;
            }
            switch (key) {
                case exports.PanningAxis.Horizontal:
                    this.pan(x, 0);
                    break;
                case exports.PanningAxis.Vertical:
                    this.pan(0, y);
                    break;
                default:
                    this.pan(x, y);
                    break;
            }
        };
        GraphComponent.prototype.updateMidpointOnEdge = function (edge, points) {
            if (!edge || !points) {
                return;
            }
            if (points.length % 2 === 1) {
                edge.midPoint = points[Math.floor(points.length / 2)];
            }
            else {
                var _first = points[points.length / 2];
                var _second = points[points.length / 2 - 1];
                edge.midPoint = {
                    x: (_first.x + _second.x) / 2,
                    y: (_first.y + _second.y) / 2
                };
            }
        };
        GraphComponent.prototype.basicUpdate = function () {
            if (this.view) {
                this.width = this.view[0];
                this.height = this.view[1];
            }
            else {
                var dims = this.getContainerDims();
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
        };
        GraphComponent.prototype.getContainerDims = function () {
            var width;
            var height;
            var hostElem = this.el.nativeElement;
            if (hostElem.parentNode !== null) {
                // Get the container dimensions
                var dims = hostElem.parentNode.getBoundingClientRect();
                width = dims.width;
                height = dims.height;
            }
            if (width && height) {
                return { width: width, height: height };
            }
            return null;
        };
        GraphComponent.prototype.unbindEvents = function () {
            if (this.resizeSubscription) {
                this.resizeSubscription.unsubscribe();
            }
        };
        GraphComponent.prototype.bindWindowResizeEvent = function () {
            var _this = this;
            var source = rxjs.fromEvent(window, 'resize');
            var subscription = source.pipe(operators.debounceTime(200)).subscribe(function (e) {
                _this.update();
                if (_this.cd) {
                    _this.cd.markForCheck();
                }
            });
            this.resizeSubscription = subscription;
        };
        return GraphComponent;
    }());
    GraphComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'ngx-graph',
                    template: "<div\n  class=\"ngx-charts-outer\"\n  [style.width.px]=\"width\"\n  [@animationState]=\"'active'\"\n  [@.disabled]=\"!animations\"\n  (mouseWheelUp)=\"onZoom($event, 'in')\"\n  (mouseWheelDown)=\"onZoom($event, 'out')\"\n  mouseWheel\n>\n  <svg:svg class=\"ngx-charts\" [attr.width]=\"width\" [attr.height]=\"height\">\n    <svg:g\n      *ngIf=\"initialized && graph\"\n      [attr.transform]=\"transform\"\n      (touchstart)=\"onTouchStart($event)\"\n      (touchend)=\"onTouchEnd($event)\"\n      class=\"graph chart\"\n    >\n      <defs>\n        <ng-container *ngIf=\"defsTemplate\" [ngTemplateOutlet]=\"defsTemplate\"></ng-container>\n        <svg:path\n          class=\"text-path\"\n          *ngFor=\"let link of graph.edges\"\n          [attr.d]=\"link.textPath\"\n          [attr.id]=\"link.id\"\n        ></svg:path>\n      </defs>\n\n      <svg:rect\n        class=\"panning-rect\"\n        [attr.width]=\"dims.width * 100\"\n        [attr.height]=\"dims.height * 100\"\n        [attr.transform]=\"'translate(' + (-dims.width || 0) * 50 + ',' + (-dims.height || 0) * 50 + ')'\"\n        (mousedown)=\"isPanning = true\"\n      />\n\n      <ng-content></ng-content>\n\n      <svg:g class=\"clusters\">\n        <svg:g\n          #clusterElement\n          *ngFor=\"let node of graph.clusters; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldClusters.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n        >\n          <ng-container\n            *ngIf=\"clusterTemplate\"\n            [ngTemplateOutlet]=\"clusterTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:g *ngIf=\"!clusterTemplate\" class=\"node cluster\">\n            <svg:rect\n              [attr.width]=\"node.dimension.width\"\n              [attr.height]=\"node.dimension.height\"\n              [attr.fill]=\"node.data?.color\"\n            />\n            <svg:text alignment-baseline=\"central\" [attr.x]=\"10\" [attr.y]=\"node.dimension.height / 2\">\n              {{ node.label }}\n            </svg:text>\n          </svg:g>\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"links\">\n        <svg:g #linkElement *ngFor=\"let link of graph.edges; trackBy: trackLinkBy\" class=\"link-group\" [id]=\"link.id\">\n          <ng-container\n            *ngIf=\"linkTemplate\"\n            [ngTemplateOutlet]=\"linkTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: link }\"\n          ></ng-container>\n          <svg:path *ngIf=\"!linkTemplate\" class=\"edge\" [attr.d]=\"link.line\" />\n        </svg:g>\n      </svg:g>\n\n      <svg:g class=\"nodes\">\n        <svg:g\n          #nodeElement\n          *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n          class=\"node-group\"\n          [class.old-node]=\"animate && oldNodes.has(node.id)\"\n          [id]=\"node.id\"\n          [attr.transform]=\"node.transform\"\n          (click)=\"onClick(node)\"\n          (mousedown)=\"onNodeMouseDown($event, node)\"\n        >\n          <ng-container\n            *ngIf=\"nodeTemplate\"\n            [ngTemplateOutlet]=\"nodeTemplate\"\n            [ngTemplateOutletContext]=\"{ $implicit: node }\"\n          ></ng-container>\n          <svg:circle\n            *ngIf=\"!nodeTemplate\"\n            r=\"10\"\n            [attr.cx]=\"node.dimension.width / 2\"\n            [attr.cy]=\"node.dimension.height / 2\"\n            [attr.fill]=\"node.data?.color\"\n          />\n        </svg:g>\n      </svg:g>\n    </svg:g>\n\n    <svg:clipPath [attr.id]=\"minimapClipPathId\">\n      <svg:rect\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n      ></svg:rect>\n    </svg:clipPath>\n\n    <svg:g\n      class=\"minimap\"\n      *ngIf=\"showMiniMap\"\n      [attr.transform]=\"minimapTransform\"\n      [attr.clip-path]=\"'url(#' + minimapClipPathId + ')'\"\n    >\n      <svg:rect\n        class=\"minimap-background\"\n        [attr.width]=\"graphDims.width / minimapScaleCoefficient\"\n        [attr.height]=\"graphDims.height / minimapScaleCoefficient\"\n        (mousedown)=\"onMinimapPanTo($event)\"\n      ></svg:rect>\n\n      <svg:g\n        [style.transform]=\"\n          'translate(' +\n          -minimapOffsetX / minimapScaleCoefficient +\n          'px,' +\n          -minimapOffsetY / minimapScaleCoefficient +\n          'px)'\n        \"\n      >\n        <svg:g class=\"minimap-nodes\" [style.transform]=\"'scale(' + 1 / minimapScaleCoefficient + ')'\">\n          <svg:g\n            #nodeElement\n            *ngFor=\"let node of graph.nodes; trackBy: trackNodeBy\"\n            class=\"node-group\"\n            [class.old-node]=\"animate && oldNodes.has(node.id)\"\n            [id]=\"node.id\"\n            [attr.transform]=\"node.transform\"\n          >\n            <ng-container\n              *ngIf=\"miniMapNodeTemplate\"\n              [ngTemplateOutlet]=\"miniMapNodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <ng-container\n              *ngIf=\"!miniMapNodeTemplate && nodeTemplate\"\n              [ngTemplateOutlet]=\"nodeTemplate\"\n              [ngTemplateOutletContext]=\"{ $implicit: node }\"\n            ></ng-container>\n            <svg:circle\n              *ngIf=\"!nodeTemplate && !miniMapNodeTemplate\"\n              r=\"10\"\n              [attr.cx]=\"node.dimension.width / 2 / minimapScaleCoefficient\"\n              [attr.cy]=\"node.dimension.height / 2 / minimapScaleCoefficient\"\n              [attr.fill]=\"node.data?.color\"\n            />\n          </svg:g>\n        </svg:g>\n\n        <svg:rect\n          [attr.transform]=\"\n            'translate(' +\n            panOffsetX / zoomLevel / -minimapScaleCoefficient +\n            ',' +\n            panOffsetY / zoomLevel / -minimapScaleCoefficient +\n            ')'\n          \"\n          class=\"minimap-drag\"\n          [class.panning]=\"isMinimapPanning\"\n          [attr.width]=\"width / minimapScaleCoefficient / zoomLevel\"\n          [attr.height]=\"height / minimapScaleCoefficient / zoomLevel\"\n          (mousedown)=\"onMinimapDragMouseDown()\"\n        ></svg:rect>\n      </svg:g>\n    </svg:g>\n  </svg:svg>\n</div>\n",
                    encapsulation: core.ViewEncapsulation.None,
                    changeDetection: core.ChangeDetectionStrategy.OnPush,
                    animations: [
                        animations.trigger('animationState', [
                            animations.transition(':enter', [animations.style({ opacity: 0 }), animations.animate('500ms 100ms', animations.style({ opacity: 1 }))])
                        ])
                    ],
                    styles: [".minimap .minimap-background{fill:#0000001a}.minimap .minimap-drag{fill:#0003;stroke:#fff;stroke-width:1px;stroke-dasharray:2px;stroke-dashoffset:2px;cursor:pointer}.minimap .minimap-drag.panning{fill:#0000004d}.minimap .minimap-nodes{opacity:.5;pointer-events:none}.graph{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.graph .edge{stroke:#666;fill:none}.graph .edge .edge-label{stroke:none;font-size:12px;fill:#251e1e}.graph .panning-rect{fill:#0000;cursor:move}.graph .node-group.old-node{transition:transform .5s ease-in-out}.graph .node-group .node:focus{outline:none}.graph .cluster rect{opacity:.2}\n"]
                },] }
    ];
    GraphComponent.ctorParameters = function () { return [
        { type: core.ElementRef },
        { type: core.NgZone },
        { type: core.ChangeDetectorRef },
        { type: LayoutService }
    ]; };
    GraphComponent.propDecorators = {
        nodes: [{ type: core.Input }],
        clusters: [{ type: core.Input }],
        links: [{ type: core.Input }],
        activeEntries: [{ type: core.Input }],
        curve: [{ type: core.Input }],
        draggingEnabled: [{ type: core.Input }],
        nodeHeight: [{ type: core.Input }],
        nodeMaxHeight: [{ type: core.Input }],
        nodeMinHeight: [{ type: core.Input }],
        nodeWidth: [{ type: core.Input }],
        nodeMinWidth: [{ type: core.Input }],
        nodeMaxWidth: [{ type: core.Input }],
        panningEnabled: [{ type: core.Input }],
        panningAxis: [{ type: core.Input }],
        enableZoom: [{ type: core.Input }],
        zoomSpeed: [{ type: core.Input }],
        minZoomLevel: [{ type: core.Input }],
        maxZoomLevel: [{ type: core.Input }],
        autoZoom: [{ type: core.Input }],
        panOnZoom: [{ type: core.Input }],
        animate: [{ type: core.Input }],
        autoCenter: [{ type: core.Input }],
        zoomToFitMargin: [{ type: core.Input }],
        update$: [{ type: core.Input }],
        center$: [{ type: core.Input }],
        zoomToFit$: [{ type: core.Input }],
        panToNode$: [{ type: core.Input }],
        layout: [{ type: core.Input }],
        layoutSettings: [{ type: core.Input }],
        enableTrackpadSupport: [{ type: core.Input }],
        showMiniMap: [{ type: core.Input }],
        miniMapMaxWidth: [{ type: core.Input }],
        miniMapMaxHeight: [{ type: core.Input }],
        miniMapPosition: [{ type: core.Input }],
        view: [{ type: core.Input }],
        scheme: [{ type: core.Input }],
        customColors: [{ type: core.Input }],
        animations: [{ type: core.Input }],
        select: [{ type: core.Output }],
        activate: [{ type: core.Output }],
        deactivate: [{ type: core.Output }],
        zoomChange: [{ type: core.Output }],
        clickHandler: [{ type: core.Output }],
        linkTemplate: [{ type: core.ContentChild, args: ['linkTemplate',] }],
        nodeTemplate: [{ type: core.ContentChild, args: ['nodeTemplate',] }],
        clusterTemplate: [{ type: core.ContentChild, args: ['clusterTemplate',] }],
        defsTemplate: [{ type: core.ContentChild, args: ['defsTemplate',] }],
        miniMapNodeTemplate: [{ type: core.ContentChild, args: ['miniMapNodeTemplate',] }],
        nodeElements: [{ type: core.ViewChildren, args: ['nodeElement',] }],
        linkElements: [{ type: core.ViewChildren, args: ['linkElement',] }],
        groupResultsBy: [{ type: core.Input }],
        zoomLevel: [{ type: core.Input, args: ['zoomLevel',] }],
        panOffsetX: [{ type: core.Input, args: ['panOffsetX',] }],
        panOffsetY: [{ type: core.Input, args: ['panOffsetY',] }],
        onMouseMove: [{ type: core.HostListener, args: ['document:mousemove', ['$event'],] }],
        onMouseDown: [{ type: core.HostListener, args: ['document:mousedown', ['$event'],] }],
        graphClick: [{ type: core.HostListener, args: ['document:click', ['$event'],] }],
        onTouchMove: [{ type: core.HostListener, args: ['document:touchmove', ['$event'],] }],
        onMouseUp: [{ type: core.HostListener, args: ['document:mouseup', ['$event'],] }]
    };
    __decorate([
        throttleable(500)
    ], GraphComponent.prototype, "updateMinimap", null);

    /**
     * Mousewheel directive
     * https://github.com/SodhanaLibrary/angular2-examples/blob/master/app/mouseWheelDirective/mousewheel.directive.ts
     *
     * @export
     */
    // tslint:disable-next-line: directive-selector
    var MouseWheelDirective = /** @class */ (function () {
        function MouseWheelDirective() {
            this.mouseWheelUp = new core.EventEmitter();
            this.mouseWheelDown = new core.EventEmitter();
        }
        MouseWheelDirective.prototype.onMouseWheelChrome = function (event) {
            this.mouseWheelFunc(event);
        };
        MouseWheelDirective.prototype.onMouseWheelFirefox = function (event) {
            this.mouseWheelFunc(event);
        };
        MouseWheelDirective.prototype.onWheel = function (event) {
            this.mouseWheelFunc(event);
        };
        MouseWheelDirective.prototype.onMouseWheelIE = function (event) {
            this.mouseWheelFunc(event);
        };
        MouseWheelDirective.prototype.mouseWheelFunc = function (event) {
            if (window.event) {
                event = window.event;
            }
            var delta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail || event.deltaY || event.deltaX));
            // Firefox don't have native support for wheel event, as a result delta values are reverse
            var isWheelMouseUp = event.wheelDelta ? delta > 0 : delta < 0;
            var isWheelMouseDown = event.wheelDelta ? delta < 0 : delta > 0;
            if (isWheelMouseUp) {
                this.mouseWheelUp.emit(event);
            }
            else if (isWheelMouseDown) {
                this.mouseWheelDown.emit(event);
            }
            // for IE
            event.returnValue = false;
            // for Chrome and Firefox
            if (event.preventDefault) {
                event.preventDefault();
            }
        };
        return MouseWheelDirective;
    }());
    MouseWheelDirective.decorators = [
        { type: core.Directive, args: [{ selector: '[mouseWheel]' },] }
    ];
    MouseWheelDirective.propDecorators = {
        mouseWheelUp: [{ type: core.Output }],
        mouseWheelDown: [{ type: core.Output }],
        onMouseWheelChrome: [{ type: core.HostListener, args: ['mousewheel', ['$event'],] }],
        onMouseWheelFirefox: [{ type: core.HostListener, args: ['DOMMouseScroll', ['$event'],] }],
        onWheel: [{ type: core.HostListener, args: ['wheel', ['$event'],] }],
        onMouseWheelIE: [{ type: core.HostListener, args: ['onmousewheel', ['$event'],] }]
    };

    var GraphModule = /** @class */ (function () {
        function GraphModule() {
        }
        return GraphModule;
    }());
    GraphModule.decorators = [
        { type: core.NgModule, args: [{
                    imports: [common.CommonModule],
                    declarations: [GraphComponent, MouseWheelDirective, VisibilityObserver],
                    exports: [GraphComponent, MouseWheelDirective],
                    providers: [LayoutService]
                },] }
    ];

    var NgxGraphModule = /** @class */ (function () {
        function NgxGraphModule() {
        }
        return NgxGraphModule;
    }());
    NgxGraphModule.decorators = [
        { type: core.NgModule, args: [{
                    imports: [common.CommonModule],
                    exports: [GraphModule]
                },] }
    ];

    /*
     * Public API Surface of ngx-graph
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.ColaForceDirectedLayout = ColaForceDirectedLayout;
    exports.D3ForceDirectedLayout = D3ForceDirectedLayout;
    exports.DagreClusterLayout = DagreClusterLayout;
    exports.DagreLayout = DagreLayout;
    exports.DagreNodesOnlyLayout = DagreNodesOnlyLayout;
    exports.GraphComponent = GraphComponent;
    exports.GraphModule = GraphModule;
    exports.MouseWheelDirective = MouseWheelDirective;
    exports.NgxGraphModule = NgxGraphModule;
    exports.toD3Node = toD3Node;
    exports.toNode = toNode;
    exports["ɵa"] = LayoutService;
    exports["ɵb"] = throttleable;
    exports["ɵc"] = VisibilityObserver;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=swimlane-ngx-graph.umd.js.map
