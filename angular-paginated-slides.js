angular.module('msl.paginated-slides', []);

angular.module('msl.paginated-slides').directive('mslPaginatedSlides', ['$compile', function ($compile) {
	return {
		restrict: 'A',
		link: function (scope, element, attributes) {
			var configuration = { query_parameter: 'slide_num' }
			var json_configuration = element.attr('msl-paginated-slides');
			var override = json_configuration ? JSON.parse(json_configuration) : {};
			if ('query_parameter' in override) configuration.query_parameter = override.query_parameter;

			element[0].removeAttribute('msl-paginated-slides');
			element.attr('msl-paginated', JSON.stringify({
				fullscreen: true,
				container: {
					attributes: [{
						name: 'msl-slides', value: JSON.stringify({
							resize: false,
							query_parameter: configuration.query_parameter
						})
					}]
				},
				pages: {
					element: 'div',
					attributes: [{ name: 'msl-slide', value: null }]
				}
			}));

			angular.element(window).bind('resize', function () {
				element[0].dispatchEvent(new Event('mslSlidesUnregisterHandlers'));
			});

			$compile(element)(scope);
		}
	};
}]);