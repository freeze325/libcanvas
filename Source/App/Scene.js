/*
---

name: "App.Scene"

description: ""

license:
	- "[GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)"
	- "[MIT License](http://opensource.org/licenses/mit-license.php)"

authors:
	- "Shock <shocksilien@gmail.com>"

requires:
	- LibCanvas
	- App

provides: App.Scene

...
*/

App.Scene = declare( 'LibCanvas.App.Scene', {

	initialize: function (app, settings) {
		this.settings = new Settings({
			invoke      : false,
			intersection: 'auto' // 'auto'|'manual'
		}).set(settings);

		this.app      = app;
		this.elements = [];
		this.redraw   = [];
		this.createLayer();
	},

	/** @private */
	tick: function (time) {
		if (this.settings.get( 'invoke' )) {
			this.sortElements();
			this.updateAll(time);
		}

		if (this.needUpdate) {
			this.draw();
			this.needUpdate = false;
		}

		return this;
	},


	/** @private */
	draw: function () {
		var i, elem,
			ctx   = this.layer.canvas.ctx,
			resources = this.app.resources,
			redraw    = this.redraw;

		if (this.settings.get('intersection') !== 'manual') {
			this.addIntersections();
		}

		// draw elements with the lower zIndex first
		atom.array.sortBy( redraw, 'zIndex' );

		for (i = redraw.length; i--;) {
			redraw[i].clearPrevious( ctx, resources );
		}

		for (i = redraw.length; i--;) {
			elem = redraw[i];
			if (elem.scene == this && elem.isVisible()) {
				elem.renderTo( ctx, resources );
				elem.redrawRequested = false;
				elem.saveCurrentBoundingShape();
			}
		}

		redraw.length = 0;
	},

	/** @private */
	sortElements: function () {
		atom.array.sortBy( this.elements, 'zIndex' );
	},

	/** @private */
	updateAll: function (time) {
		atom.array.invoke( this.elements, 'onUpdate', time, this.app.resources );
	},

	/** @private */
	needUpdate: false,

	/** @private */
	createLayer: function () {
		this.layer = this.app.container.createLayer(
			this.settings.get([ 'name', 'zIndex' ])
		);
	},

	/** @private */
	addElement: function (element) {
		if (element.scene != this) {
			element.scene = this;
			this.elements.push( element );
			this.redrawElement( element );
		}
		return this;
	},

	/** @private */
	rmElement: function (element) {
		if (element.scene == this) {
			this.redrawElement ( element );
			this.elements.erase( element );
			element.scene = null;
		}
		return this;
	},

	/** @private */
	redrawElement: function (element) {
		if (element.scene == this && !element.redrawRequested) {
			this.redraw.push( element );
			this.needUpdate = true;
		}
		return this;
	},

	/** @private */
	addIntersections: function () {
		var i, elem,
			redraw = this.redraw,
			scene  = this;

		for (i = 0; i < redraw.length; i++) {
			elem = redraw[i];

			this.findIntersections(elem.previousBoundingShape, elem)
				.forEach(function (e) {
					scene.redrawElement( e );
				});
			this.findIntersections(elem.currentBoundingShape, elem)
				.forEach(function (e) {
					// we need to redraw it, only if it is over our element
					if (e.zIndex > elem.zIndex) {
						scene.redrawElement( e );
					}
				});
		}
	},

	/** @private */
	findIntersections: function (shape, elem) {
		var i, e, elems = [];
		for (i = this.elements.length; i--;) {
			e = this.elements[i];
			if (e != elem && e.isVisible() && e.currentBoundingShape.intersect( shape )) {
				elems.push( e );
			}
		}
		return elems;
	}

});