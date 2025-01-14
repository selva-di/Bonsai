'use strict';

bonsaiApp.directive('diginotgate', function () {
    return {
        restrict: 'E',
        transclude: false,
        scope: {
            inA: '=',
            out: '=',
            top: '=',
            left: '=',
            label: '=',
            toplabel: '=',
            leftlabel: '=',
            fontsize: '=',
            circle: '=',
            gateName: '@'
        },
        link: function ($scope, element, attrs) {
            $scope.logicGate = new NotGate($scope.inA, $scope.out);

            $scope.topCSS = ($scope.top - 3) + 'px';
            $scope.leftCSS = $scope.left + 'px';

            attrs.$observe('gateName', function() {
                if ($scope.gateName) {
                    $scope.logicGate.setName($scope.gateName);
                }
            });

            $scope.getConnectionPositions = function (wire) {
                if (wire === $scope.inA) {
                    return [{top: ($scope.top + 5), left: ($scope.left - 2)}];
                } else if (wire === $scope.out) {
                    if ($scope.circle) {
                      return [{top: ($scope.top + 5), left: ($scope.left + 30)}];
                    }
                    else {
                    	return [{top: ($scope.top + 5), left: ($scope.left + 21)}];
                    }
                } else {
                    console.log("This Wire is not connected: " + wire.getName());
                }
            };
            
            $scope.$watch('label', function(newLabel, oldLabel) {
            	  if (typeof($scope.label) == "undefined") {
								    $scope.label = '1';            	  
            	  }
            });
            
             $scope.$watch('toplabel', function(newLabel, oldLabel) {
            	  if (typeof($scope.toplabel) == "undefined") {
								    $scope.toplabel = -7;            	  
            	  }
            });
            
             $scope.$watch('leftlabel', function(newLabel, oldLabel) {
            	  if (typeof($scope.leftlabel) == "undefined") {
								    $scope.leftlabel = 6;            	  
            	  }
            });
            
             $scope.$watch('fontsize', function(newLabel, oldLabel) {
            	  if (typeof($scope.fontsize) == "undefined") {
								    $scope.fontsize = 14;            	  
            	  }
            });
            
            $scope.$watch('circle', function(newLabel, oldLabel) {
            	  if (typeof($scope.circle) == "undefined") {
								    $scope.circle = true;            	  
            	  }
            });

            $scope.$watch('inA', function (newInA, oldInA) {
                if (newInA) {
                    newInA.enrollToDirective($scope.logicGate, $scope.getConnectionPositions);
                    newInA.registerReaderAndRead($scope.logicGate);
                }
                if (oldInA && (newInA != oldInA)) {
                    oldInA.resign($scope.logicGate);
                }
                $scope.inAEnrolled = true;
                $scope.checkForFinishedInitialization();
            });

            $scope.$watch('out', function (newOut, oldOut) {
                if (newOut) {
                    newOut.enrollToDirective($scope.logicGate, $scope.getConnectionPositions);
                }
                if (oldOut && (newOut != oldOut)) {
                    oldOut.resign($scope.logicGate);
                }
                $scope.outEnrolled = true;
                $scope.checkForFinishedInitialization();
            });

            $scope.checkForFinishedInitialization = function () {
                if ($scope.controllerIsRead &&
                    $scope.inAEnrolled &&
                    $scope.outEnrolled &&
                    !$scope.initializationSuccessful) {
                    $scope.initializationSuccessful = true;
                    $scope.$emit('componentInitialized', $scope.logicGate);
                }
            };

            $scope.$on('sendInitialValues', function (event, message) {
                $scope.logicGate.setValue();
            });

            $scope.controllerIsRead = true;
            $scope.checkForFinishedInitialization();
        },
        templateUrl: '../../partials/component_DigiNotGate.html'
    };
});