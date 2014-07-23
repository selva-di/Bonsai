'use strict';

bonsaiApp.directive('bus', function () {
    return {
        restrict: 'E',
        scope: {
            bus: '=',
            maxValue: '=',
            busName: '@',
            base: '=',
            color: '=',
            top: '=',
            left: '='
        },
        link: function ($scope, element, attrs) {
            $scope.localBus = $scope.bus || {};

            attrs.$observe('busName', function () {
                if ($scope.busName) {
                    $scope.localBus.setName($scope.busName);
                }
            });

            $scope.$watch('base', function () {
                if (parseInt($scope.base) in {2:true, 8:true, 10:true, 16:true}) {
                    $scope.displayBase = $scope.base;
                } else {
                    $scope.displayBase = 10;
                }
            });

            $scope.$watch('top', function () {
                $scope.topCSS = $scope.top + 'em';
            });
            $scope.$watch('left', function () {
                $scope.leftCSS = $scope.left + 'em';
            });

            $scope.$watch('maxValue', function () {
                $scope.localBus.setMax($scope.maxValue);
            });

            $scope.busRouter = new BusRouter($scope.localBus.getBuses(), $scope.localBus);

            $scope.value = undefined;

            $scope.localBus.setUpdateViewCallback(function (newValue) {
                $scope.value = newValue;
            });

            $scope.$watch('value', function(newValue, oldValue) {
                $scope.localBus.value = newValue;
            });

            $scope.updateVisibleParts = function() {
                $scope.busRouter.setConnections($scope.localBus.getBuses());
                $scope.visibleParts = $scope.busRouter.updateVisibleParts();
            };

            $scope.localBus.enrollToDirective = function (enrollee, getPositions) {
                var connection = $scope.localBus.enroll(enrollee);
                connection.getPositions = getPositions;
                $scope.updateVisibleParts();
            };

            $scope.localBus.registerMovement = function () {
                $scope.updateVisibleParts();
            };

            $scope.localBus.getColor = function () {
                return $scope.color;
            };
        },
        templateUrl: 'partials/component_Bus.html'
    }
});