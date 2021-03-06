angular.module('msl.slides', []);

angular.module('msl.slides').factory('mslViewport', [function () {
	return {
		size: function () {
			return {
				width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
				height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
			};
		}
	};
}]);

angular.module('msl.slides').factory('mslViewportFiller', ['mslViewport', function (mslViewport) {
	return {
		fillWith: function (element) {
			var size = mslViewport.size();
			element.css('width', size.width + 'px');
			element.css('height', size.height + 'px');
		}
	};
}]);

angular.module('msl.slides').factory('mslKeyEvents', [function () {
	return {
		isArrowLeft: function (event) {
			return event.which === 37;
		},
		isArrowRight: function (event) {
			return event.which === 39;
		}
	};
}]);

angular.module('msl.slides').factory('mslAnimatedHorizontalScroll', ['$q', function ($q) {
	function EASE_IN_OUT_CUBIC(p, v1, v2) {
		var t1 = v1 * Math.pow(1 - p, 3);
		var t2 = 3 * v1 * p * Math.pow(1 - p, 2);
		var t3 = 3 * v2 * (1 - p) * Math.pow(p, 2);
		var t4 = v2 * Math.pow(p, 3);
		return t1 + t2 + t3 + t4;
	}

	return {
		scroll: function (page, start, stop) {
			var deferred = $q.defer();

			var animation = {};
			
			var T = animation ? (animation.duration || 500) : 500;
			var f =  animation ? (animation.frequency || 15) : 15;
			var dt = T / f;
			var t = dt;
			var e =  animation ? (animation.easing || EASE_IN_OUT_CUBIC) : EASE_IN_OUT_CUBIC;

			var ai = setInterval(function () {
				if (t <= T) {
					var p = (Math.abs(T - t) < dt) ? 1 : (t / T);
					var x = e(p, start, stop);
					page.css('margin-left', x + 'px');
					t += dt;
				} else {
					clearInterval(ai);
					deferred.resolve();
				}
			}, dt);

			return deferred.promise;
		}
	};
}]);

angular.module('msl.slides').factory('mslPageSwitcher', ['$q', '$location', 'mslViewport', 'mslAnimatedHorizontalScroll', function ($q, $location, mslViewport, mslAnimatedHorizontalScroll) {
	return {
		alignCurrent: function (scope) {
			var size = mslViewport.size();
			var i = scope.current_page_num;
			var x = -i * size.width;
			scope.pages[0].css('margin-left', x + 'px');
		},

		prev: function (scope, configuration) {
			var deferred = $q.defer();

			if (scope.current_page_num > 0) {
				var size = mslViewport.size();
				var current = -(scope.current_page_num) * size.width;
				var prev = current + size.width;
				mslAnimatedHorizontalScroll.scroll(scope.pages[0], current, prev).then(function () {
					scope.current_page_num--;
					$location.search(configuration.query_parameter, scope.current_page_num + 1);
					deferred.resolve();
				});
			} else deferred.resolve();

			return deferred.promise;
		},

		next: function (scope, configuration) {
			var deferred = $q.defer();

			if (scope.current_page_num < scope.pages.length - 1) {
				var size = mslViewport.size();
				var current = -(scope.current_page_num) * size.width;
				var next = current - size.width;
				var scroll_promise = mslAnimatedHorizontalScroll.scroll(scope.pages[0], current, next).then(function () {
					scope.current_page_num++;
					$location.search(configuration.query_parameter, scope.current_page_num + 1);
					deferred.resolve();
				});
			} else deferred.resolve();

			return deferred.promise;
		},

		goTo: function (scope, target_page_num, configuration) {
			var deferred = $q.defer();

			if (true) {
				var size = mslViewport.size();
				var current = -(scope.current_page_num) * size.width;
				var target = -(target_page_num) * size.width;
				var scroll_promise = mslAnimatedHorizontalScroll.scroll(scope.pages[0], current, target).then(function () {
					scope.current_page_num = target_page_num;
					$location.search(configuration.query_parameter, scope.current_page_num + 1);
					deferred.resolve();
				});
			} else deferred.resolve();

			return deferred.promise;
		}
	};
}]);

angular.module('msl.slides').factory('mslSwipeDetector', [function () {
	return {
		setup: function () {
			var last_touch;

			angular.element(document.body).bind('touchstart', function (event) {
				last_touch = {
					pageX: event.changedTouches[0].pageX,
					pageY: event.changedTouches[0].pageY
				};
			});

			angular.element(document.body).bind('touchmove', function (event) {
				event.preventDefault();
			});

			angular.element(document.body).bind('touchend', function (event) {
				var current = event.changedTouches[0];
				var dx = current.pageX - last_touch.pageX;
				var dy = current.pageY - last_touch.pageY;
				var horizontal_swipe = Math.abs(dx) > Math.abs(dy);
				if (horizontal_swipe) {
					if (dx > 0) {
						var e = new Event('mslSwipeRight');
						document.body.dispatchEvent(e);
					} else if (dx < 0) {
						var e = new Event('mslSwipeLeft');
						document.body.dispatchEvent(e);
					}
				}
			});
		}
	};
}]);

angular.module('msl.slides').factory('mslEventHandlersManager', ['mslKeyEvents', 'mslSwipeDetector', 'mslPageSwitcher', function (mslKeyEvents, mslSwipeDetector, mslPageSwitcher) {
	return {
		prev: function (scope, configuration) {
			var me = this;
			me.stopHandlers();
			mslPageSwitcher.prev(scope, configuration).then(function () {
				me.startHandlers();
			});
		},

		next: function (scope, configuration) {
			var me = this;
			me.stopHandlers();
			mslPageSwitcher.next(scope, configuration).then(function () {
				me.startHandlers();
			});
		},

		setupHandlers: function (scope, configuration) {
			var me = this;
			this.keyboard_handler = function (event) {
				if (mslKeyEvents.isArrowLeft(event)) me.prev(scope, configuration);
				else if (mslKeyEvents.isArrowRight(event)) me.next(scope, configuration);
			};
			this.swipe_handler = function (event) {
				if (event.type === 'mslSwipeRight') me.prev(scope, configuration);
				else if (event.type === 'mslSwipeLeft') me.next(scope, configuration);
			}
			mslSwipeDetector.setup();
			this.startHandlers();
		},

		startHandlers: function () {
			angular.element(document.body).bind('keydown', this.keyboard_handler);
			angular.element(document.body).bind('mslSwipeLeft', this.swipe_handler);
			angular.element(document.body).bind('mslSwipeRight', this.swipe_handler);
		},

		stopHandlers: function () {
			angular.element(document.body).unbind('keydown', this.keyboard_handler);
			angular.element(document.body).unbind('mslSwipeLeft', this.swipe_handler);
			angular.element(document.body).unbind('mslSwipeRight', this.swipe_handler);
		}
	};
}]);

angular.module('msl.slides').directive('mslSlides', ['$compile', '$location', 'mslPageSwitcher', 'mslEventHandlersManager', 'mslViewportFiller', function ($compile, $location, mslPageSwitcher, mslEventHandlersManager, mslViewportFiller) {
	return {
		restrict: 'A',
		link: function (scope, element, attributes) {
			var configuration = {
				query_parameter: 'slide_num',
				resize: true
			};
			var json_configuration = element.attr('msl-slides');
			var override = json_configuration ? JSON.parse(json_configuration) : {};
			if ('query_parameter' in override) configuration.query_parameter = override.query_parameter;
			if ('resize' in override) configuration.resize = override.resize;

			angular.element(document.body).css('margin', '0');

			element.css('white-space', 'nowrap');
			element.css('overflow', 'hidden');

			scope.current_page_num = 0;
			scope.pages = [];
			var children = element.children();
			var num_children = children.length;
			for (var i = 0; i < num_children; i++) {
				var child = children.eq(i);
				if (child.attr('msl-slide') !== undefined) {
					scope.pages.push(child);
					child.attr('msl-slide', JSON.stringify({ resize: configuration.resize }));
				}
			}

			mslViewportFiller.fillWith(element);
			if (configuration.resize) angular.element(window).on('resize', function (event) {
				mslViewportFiller.fillWith(element);
				mslPageSwitcher.alignCurrent(scope);
			});

			mslEventHandlersManager.setupHandlers(scope, configuration);
			var url_watcher_unregister = scope.$watch(
				function () {
					return $location.search()[configuration.query_parameter];
				},
				function (new_value) {
					var target_page_num = parseInt(new_value);
					var valid_page_num = !isNaN(target_page_num); // test if is a number
					if (valid_page_num) target_page_num = target_page_num - 1;
					if (valid_page_num) valid_page_num = target_page_num % 1 === 0; // test if integer
					if (valid_page_num) valid_page_num = target_page_num >= 0; // test not before first slide
					if (valid_page_num) valid_page_num = target_page_num < scope.pages.length; // test not after last slide
					if (valid_page_num) valid_page_num = target_page_num != scope.current_page_num;
					if (valid_page_num) mslPageSwitcher.goTo(scope, target_page_num, configuration);
				}
			);
			element.bind('mslSlidesUnregisterHandlers', function () {
				url_watcher_unregister();
			});

			for (var i = 0; i < scope.pages.length; i++) $compile(scope.pages[i])(scope);
		}
	};
}]);

angular.module('msl.slides').directive('mslSlide', ['mslViewportFiller', function (mslViewportFiller) {
	return {
		restrict: 'A',
		link: function (scope, element, attributes) {
			var configuration = {};
			var json_configuration = element.attr('msl-slide');
			var override = json_configuration ? JSON.parse(json_configuration) : {};
			if (override && 'resize' in override) configuration.resize = override.resize;

			element.css('white-space', 'normal');
			element.css('display', 'inline-block');
			element.css('overflow', 'hidden');

			// Strip all following whitespace
			var parent = element[0].parentElement
			var next_sibling = element[0].nextSibling;
			while (next_sibling && !(next_sibling.nodeType === 1 && next_sibling.getAttribute('msl-slide'))) {
				if (next_sibling.nodeType === 3) parent.removeChild(next_sibling);
				next_sibling = next_sibling.nextSibling;
			}

			mslViewportFiller.fillWith(element);
			if (configuration.resize) angular.element(window).bind('resize', function (event) {
				mslViewportFiller.fillWith(element);
			});
		}
	};
}]);