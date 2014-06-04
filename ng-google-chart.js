/**
 * @description Google Chart Api Directive Module for AngularJS
 * @version 0.0.9
 * @author Nicolas Bouillon <nicolas@bouil.org>
 * @author GitHub contributors
 * @moidifier Peter Yun <nulpulum@gmail.com>
 * @license MIT
 * @year 2013
 */
(function (document, window, angular) {
    'use strict';

    angular.module('googlechart', [])

        .constant('googleChartApiConfig', {
            version: '1.0',
            optionalSettings: {
                packages: ['corechart']
            }
        })

        /**
         * 인코딩 주의)
         * index.html 안에 UTF-8 설정
         * <meta http-equiv="content-type" content="text/html; charset=UTF-8">
         *
         * 사용예)
         * <script type="text/javascript" src="https://www.google.com/jsapi"></script>
         * <script type="text/javascript">
         *   google.load('visualization', '1.0', {'packages':['corechart']});
         *   google.setOnLoadCallback(drawChart);
         *   function drawChart() { ... }
         * </script>
         *
         * @변경 : jsapi.js 파일을 로컬에서 읽어오도록 수정할 수 있다
         * googleJsapiUrlProvider.setProtocol(undiefined);
         * googleJsapiUrlProvider.setUrl('jsapi.js');
         *
         * @참조 : https://google-developers.appspot.com/chart/interactive/docs/quick_start
         */
        .provider('googleJsapiUrl', function () {
            var protocol = 'https:';
            var url = '//www.google.com/jsapi';

            this.setProtocol = function(newProtocol) {
                protocol = newProtocol;
            };

            this.setUrl = function(newUrl) {
                url = newUrl;
            };

            this.$get = function() {
                return (protocol ? protocol : '') + url;
            };
        })

        /**
         * google.load('visualization', '1.0', {'packages':['corechart']}); 수행하는 팩토리
         *
         * @param  {[type]} $rootScope     [description]
         * @param  {[type]} $q             [description]
         * @param  {[type]} apiConfig      [description]
         * @param  {[type]} googleJsapiUrl [description]
         * @return {[type]}                [description]
         */
        .factory('googleChartApiPromise', ['$rootScope', '$q', 'googleChartApiConfig', 'googleJsapiUrl', function ($rootScope, $q, apiConfig, googleJsapiUrl) {
            var apiReady = $q.defer();
            var onLoad = function () {
                // override callback function
                var settings = {
                    callback: function () {
                        var oldCb = apiConfig.optionalSettings.callback;
                        $rootScope.$apply(function () {
                            apiReady.resolve();
                        });

                        if (angular.isFunction(oldCb)) {
                            oldCb.call(this);
                        }
                    }
                };

                settings = angular.extend({}, apiConfig.optionalSettings, settings);

                window.google.load('visualization', apiConfig.version, settings);
            };
            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');

            script.setAttribute('type', 'text/javascript');
            script.src = googleJsapiUrl;

            if (script.addEventListener) { // Standard browsers (including IE9+)
                //console.log('>>> 1. load jsapi...');
                script.addEventListener('load', onLoad, false);
            } else { // IE8 and below
                //console.log('>>> 2. load jsapi...');
                script.onreadystatechange = function () {
                    if (script.readyState === 'loaded' || script.readyState === 'complete') {
                        script.onreadystatechange = null;
                        onLoad();
                    }
                };
            }

            head.appendChild(script);

            return apiReady.promise;
        }])

        /**
         * Element 또는 Attribute로 사용할 수 있다. Element 사용시에는 IE8+에 대한 고려가 있어야 함
         *
         * 사용예)
         * <div google-chart chart="chartObject" style="height:300px; width:100%;"></div>
         *
         * @param  {[type]} $timeout              [description]
         * @param  {[type]} $window               [description]
         * @param  {[type]} $rootScope            [description]
         * @param  {[type]} googleChartApiPromise [description]
         * @return {[type]}                       [description]
         */
        .directive('googleChart', ['$timeout', '$window', '$rootScope', 'googleChartApiPromise', function ($timeout, $window, $rootScope, googleChartApiPromise) {
            return {
                restrict: 'EA',
                scope: {
                    chartOrig: '=chart',
                    onReady: '&',
                    select: '&'
                },
                link: function ($scope, $elm, attrs) {
                    // Watches, to refresh the chart when its data, title or dimensions change
                    $scope.$watch('chartOrig', function () {
						$scope.chart = angular.copy($scope.chartOrig);
                        drawAsync();
                    }, true); // true is for deep object equality checking

                    // Redraw the chart if the window is resized
                    $rootScope.$on('resizeMsg', function () {
                        $timeout(function () {
                            // Not always defined yet in IE so check
                            if($scope.chartWrapper) {
                                drawAsync();
                            }
                        });
                    });

                    // Keeps old formatter configuration to compare against
                    $scope.oldChartFormatters = {};

                    function applyFormat(formatType, formatClass, dataTable) {
                        var i, cIdx;

                        if (typeof($scope.chart.formatters[formatType]) != 'undefined') {
                            if (!angular.equals($scope.chart.formatters[formatType], $scope.oldChartFormatters[formatType])) {
                                $scope.oldChartFormatters[formatType] = $scope.chart.formatters[formatType];
                                $scope.formatters[formatType] = [];

                                if (formatType === 'color') {
                                    for (cIdx = 0; cIdx < $scope.chart.formatters[formatType].length; cIdx++) {
                                        var colorFormat = new formatClass();

                                        for (i = 0; i < $scope.chart.formatters[formatType][cIdx].formats.length; i++) {
                                            var data = $scope.chart.formatters[formatType][cIdx].formats[i];

                                            if (typeof(data.fromBgColor) != 'undefined' && typeof(data.toBgColor) != 'undefined')
                                                colorFormat.addGradientRange(data.from, data.to, data.color, data.fromBgColor, data.toBgColor);
                                            else
                                                colorFormat.addRange(data.from, data.to, data.color, data.bgcolor);
                                        }

                                        $scope.formatters[formatType].push(colorFormat)
                                    }
                                } else {

                                    for (i = 0; i < $scope.chart.formatters[formatType].length; i++) {
                                        $scope.formatters[formatType].push(new formatClass(
                                            $scope.chart.formatters[formatType][i])
                                        );
                                    }
                                }
                            }

                            //apply formats to dataTable
                            for (i = 0; i < $scope.formatters[formatType].length; i++) {
                                if ($scope.chart.formatters[formatType][i].columnNum < dataTable.getNumberOfColumns())
                                    $scope.formatters[formatType][i].format(dataTable, $scope.chart.formatters[formatType][i].columnNum);
                            }

                            //Many formatters require HTML tags to display special formatting
                            if (formatType === 'arrow' || formatType === 'bar' || formatType === 'color')
                                $scope.chart.options.allowHtml = true;
                        }
                    }

                    function draw() {
                        // 그리고 있는중에는 다시 그리기 안함
                        if (!draw.triggered && ($scope.chart != undefined)) {
                            draw.triggered = true;
                            // ref: https://docs.angularjs.org/api/ng/service/$timeout
                            $timeout(function () {
                                if (typeof($scope.formatters) === 'undefined')
                                    $scope.formatters = {};

                                var dataTable;
                                if ($scope.chart.data instanceof google.visualization.DataTable)
                                    dataTable = $scope.chart.data;
                                else if (angular.isArray($scope.chart.data))
                                    dataTable = google.visualization.arrayToDataTable($scope.chart.data);
                                else
                                    dataTable = new google.visualization.DataTable($scope.chart.data, 0.5);

                                if (typeof($scope.chart.formatters) != 'undefined') {
                                    applyFormat("number", google.visualization.NumberFormat, dataTable);
                                    applyFormat("arrow", google.visualization.ArrowFormat, dataTable);
                                    applyFormat("date", google.visualization.DateFormat, dataTable);
                                    applyFormat("bar", google.visualization.BarFormat, dataTable);
                                    applyFormat("color", google.visualization.ColorFormat, dataTable);
                                }

                                var customFormatters = $scope.chart.customFormatters;
                                if (typeof(customFormatters) != 'undefined') {
                                    for (var name in customFormatters) {
                                        applyFormat(name, customFormatters[name], dataTable);
                                    }
                                }
								
								// resize > 0 이상이면 적용됨  
								// by peter yun
								// <div style="height:100%" id="gc"> 
								//	<div google-chart chart="chartObject" resize="#gc" style="width:100%;"></div>
								// </div>
								var height = angular.element(attrs.resize).height();
								if(height) {
									$scope.chart.options.height = height;
								}

                                var chartWrapperArgs = {
                                    chartType: $scope.chart.type,
                                    dataTable: dataTable,
                                    view: $scope.chart.view,
                                    options: $scope.chart.options,
                                    containerId: $elm[0]
                                };

                                $scope.chartWrapper = new google.visualization.ChartWrapper(chartWrapperArgs);
                                google.visualization.events.addListener($scope.chartWrapper, 'ready', function () {
                                    $scope.chart.displayed = true;
                                    $scope.$apply(function (scope) {
                                        scope.onReady({chartWrapper: scope.chartWrapper});
                                    });
                                });
                                google.visualization.events.addListener($scope.chartWrapper, 'error', function (err) {
                                    console.log("Chart not displayed due to error: " + err.message + ". Full error object follows.");
                                    console.log(err);
                                });
                                google.visualization.events.addListener($scope.chartWrapper, 'select', function () {
                                    var selectedItem = $scope.chartWrapper.getChart().getSelection()[0];
                                    $scope.$apply(function () {
                                        $scope.select({selectedItem: selectedItem});
                                    });
                                });


                                $timeout(function () {
                                    $elm.empty();
                                    $scope.chartWrapper.draw();
									                  draw.triggered = false;
                                });
                            }, 0, true);
                        }
                    }

                    /**
                     * jsapi의 load가 끝나면 draw하도록 promise를 걸어 놓은 것
                     *
                     * @return {[type]} [description]
                     */
                    function drawAsync() {
                        googleChartApiPromise.then(function () {
                            draw();
                        })
                    }
					
					$scope.$on('$destroy', function () {
					   google.visualization.events.removeAllListeners($scope.chartWrapper);
					   $scope.chartWrapper = null;
					});
                }
            };
        }])

        /**
         * window즉 브라우져의 사이즈가 변경되면 google chart의 size를 변경토록 한다. 단 html설정에서 다음과 같이 되어야 한다
         * <div google-chart chart="chartObject" style="height:300px; width:100%;"></div>
         * height는 %가 아니라 자신이 속한 parent dive의 height를 따르도록 해주어야 한다
         *
         * @param  {[type]} $rootScope [description]
         * @param  {[type]} $window    [description]
         * @return {[type]}            [description]
         */
        .run(['$rootScope', '$window', function ($rootScope, $window) {
            angular.element($window).bind('resize', function () {
                $rootScope.$emit('resizeMsg');
            });
        }]);

})(document, window, window.angular);
