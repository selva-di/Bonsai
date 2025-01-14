'use strict';

bonsaiApp.directive('register', function () {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            value: '=',
            registerName: '@',
            base: '=',
            maxValue: '=',
            top: '=',
            left: '=',
            incWire: '=',
            decWire: '=',
            clrWire: '='
        },
        controller: function ($scope, $filter) {
            $scope.data = $scope.value;
            if (parseInt($scope.base) in {2:true, 8:true, 10:true, 16:true}) {
                $scope.displayBase = $scope.base;
            } else {
                $scope.displayBase = 10;
            }

            $scope.dataChangeCallback = function (data) {
                if ($scope.displayBase === 2) {
                    $scope.data = $filter('binary')(data);
                } else if ($scope.displayBase === 8) {
                    $scope.data = $filter('octal')(data);
                } else if ($scope.displayBase === 16) {
                    $scope.data = $filter('hexadecimal')(data);
                } else {
                    $scope.data = data;
                }
            };

            $scope.register = new Register(
                $scope.dataChangeCallback,
                $scope.registerName,
                $scope.data,
                $scope.incWire,
                $scope.decWire,
                $scope.clrWire
            );
            $scope.topCSS = $scope.top + 'px';
            $scope.leftCSS = $scope.left + 'px';

            $scope.connectionsInitialStates = [];

            this.addBusConnection = function (bus, setWrite, setRead, initialState) {
                var connection = $scope.register.addBusConnection(bus, setWrite, setRead);
                bus.enrollToDirective(
                    $scope.register,
                    $scope.getConnectionPositions
                );
                if (setWrite) {
                    connection.writeWireConnector = new ReadingControlWireConnector(setWrite,
                        function (wire) {
                            var buses = $scope.register.getBuses();
                            var bus;
                            for (var k = 0; k < buses.length; k++) {
                                if (wire === buses[k].writeWire) {
                                    bus = buses[k].bus;
                                }
                            }
                            $scope.register.setToWrite(bus);
                        },
                        function (wire) {
                            var buses = $scope.register.getBuses();
                            var bus;
                            for (var k = 0; k < buses.length; k++) {
                                if (wire === buses[k].writeWire) {
                                    bus = buses[k].bus;
                                }
                            }
                            $scope.register.setWriteToDisconnected(bus);
                        }, $scope.registerName + ' write wire connector for bus ' + bus.getName());
                    setWrite.enrollToDirective(
                        connection.writeWireConnector,
                        $scope.getWireConnectionPositions
                    );
                    setWrite.registerReaderAndRead(connection.writeWireConnector);
                }
                if (setRead) {
                    connection.readWireConnector = new ReadingControlWireConnector(setRead,
                        function (wire) {
                            var buses = $scope.register.getBuses();
                            var bus;
                            for (var k = 0; k < buses.length; k++) {
                                if (wire === buses[k].readWire) {
                                    bus = buses[k].bus;
                                }
                            }
                            $scope.register.setToRead(bus);
                        },
                        function (wire) {
                            var buses = $scope.register.getBuses();
                            var bus;
                            for (var k = 0; k < buses.length; k++) {
                                if (wire === buses[k].readWire) {
                                    bus = buses[k].bus;
                                }
                            }
                            $scope.register.setReadToDisconnected(bus);
                        }, $scope.registerName + ' read wire connector for bus ' + bus.getName());
                    setRead.enrollToDirective(
                        connection.readWireConnector,
                        $scope.getWireConnectionPositions
                    );
                    setRead.registerReaderAndRead(connection.readWireConnector);
                }
                $scope.connectionsInitialStates.push({
                    'bus': bus,
                    'state': initialState
                });
            };
        },
        link: function ($scope, element, attrs) {
            attrs.$observe('registerName', function() {
                if ($scope.registerName) {
                    $scope.register.setName($scope.registerName);
                }
            });

            $scope.$watch('data', function(newValue, oldValue) {
                if (newValue != undefined) {
                    newValue = String(newValue);
                    if ($scope.displayBase === 2) {
                        if (newValue.match(/[0,1]*/)[0] === newValue) {
                            var convertedValue = 0;
                            for (var i = 1; i <= newValue.length; i++) {
                                convertedValue += parseInt(newValue[i - 1]) * Math.pow(2, newValue.length - i);
                            }
                            try {
                                $scope.register.setValue(convertedValue);
                            } catch (exception) {
                                $scope.data = oldValue;
                                throw exception;
                            }
                        } else {
                            $scope.data = oldValue;
                        }
                    } else if ($scope.displayBase === 8) {
                        if (newValue.match(/[0-7]*/)[0] === newValue) {
                            convertedValue = 0;
                            for (i = 1; i <= newValue.length; i++) {
                                convertedValue += parseInt(newValue[i - 1]) * Math.pow(8, newValue.length - i);
                            }
                            try {
                                $scope.register.setValue(convertedValue);
                            } catch (exception) {
                                $scope.data = oldValue;
                                throw exception;
                            }
                        } else {
                            $scope.data = oldValue;
                        }
                    } else if ($scope.displayBase === 16) {
                        if (newValue.match(/[0-9,a-f]*/)[0] === newValue) {
                            convertedValue = 0;
                            for (i = 1; i <= newValue.length; i++) {
                                var digit = parseInt(newValue[i - 1]);
                                if (newValue[i - 1] === 'a') {
                                    digit = 10;
                                } else if (newValue[i - 1] === 'b') {
                                    digit = 11;
                                } else if (newValue[i - 1] === 'c') {
                                    digit = 12;
                                } else if (newValue[i - 1] === 'd') {
                                    digit = 13;
                                } else if (newValue[i - 1] === 'e') {
                                    digit = 14;
                                } else if (newValue[i - 1] === 'f') {
                                    digit = 15;
                                }
                                convertedValue += digit * Math.pow(16, newValue.length - i);
                            }
                            try {
                                $scope.register.setValue(convertedValue);
                            } catch (exception) {
                                $scope.data = oldValue;
                                throw exception;
                            }
                        } else {
                            $scope.data = oldValue;
                        }
                    } else {
                        if (newValue.match(/[0-9]*/)[0] === newValue) {
                            try {
                                $scope.register.setValue(newValue);
                            } catch (exception) {
                                $scope.data = oldValue;
                                throw exception;
                            }
                        } else {
                            $scope.data = oldValue;
                        }
                    }
                }
            });

            $scope.$watch('maxValue', function(newValue) {
                var val = parseInt(newValue);
                if (!isNaN(val) && val >= 0) {
                    $scope.register.setMaxValue(val);
                }
            });

            $scope.setValue = function (value) {
                $scope.register.setValue(value);
            };

            $scope.setState = function (connection, desiredState) {
                window.getSelection().removeAllRanges(); // Hack to unselect the arrows to keep the color visible.
                $scope.register.setState(connection, desiredState);
            };

            $scope.activateInc = function ($event) {
                $event.preventDefault();
                if ($scope.incWire) {
                    $scope.incWire.unregisterReader($scope.incWireConnector);
                    try {
                        $scope.incWire.write($scope.incWireConnector, 1);
                        $scope.register.inc();
                    } catch (exception) {
                        $scope.incWire.registerReaderAndRead($scope.incWireConnector);
                        throw exception;
                    }
                } else {
                    $scope.register.inc();
                }
            };

            $scope.deactivateInc = function () {
                if ($scope.incWire) {
                    try {
                        $scope.incWire.write($scope.incWireConnector, 0);
                    } catch (exception) {
                        throw exception;
                    } finally {
                        $scope.incWire.stopWriting($scope.incWireConnector);
                        $scope.incWire.registerReaderAndRead($scope.incWireConnector);
                    }
                }
            };

            $scope.activateDec = function ($event) {
                $event.preventDefault();
                if ($scope.decWire) {
                    $scope.decWire.unregisterReader($scope.decWireConnector);
                    try {
                        $scope.decWire.write($scope.decWireConnector, 1);
                        $scope.register.dec();
                    } catch (exception) {
                        $scope.decWire.registerReaderAndRead($scope.decWireConnector);
                        throw exception;
                    }
                } else {
                    $scope.register.dec();
                }
            };

            $scope.deactivateDec = function () {
                if ($scope.decWire) {
                    try {
                        $scope.decWire.write($scope.decWireConnector, 0);
                    } catch (exception) {
                        throw exception;
                    } finally {
                        $scope.decWire.stopWriting($scope.decWireConnector);
                        $scope.decWire.registerReaderAndRead($scope.decWireConnector);
                    }
                }
            };

            $scope.activateClr = function ($event) {
                $event.preventDefault();
                if ($scope.clrWire) {
                    $scope.clrWire.unregisterReader($scope.clrWireConnector);
                    try {
                        $scope.clrWire.write($scope.clrWireConnector, 1);
                        $scope.register.clr();
                    } catch (exception) {
                        $scope.clrWire.registerReaderAndRead($scope.clrWireConnector);
                        throw exception;
                    }
                } else {
                    $scope.register.clr();
                }
            };

            $scope.deactivateClr = function () {
                if ($scope.clrWire) {
                    try {
                        $scope.clrWire.write($scope.clrWireConnector, 0);
                    } catch (exception) {
                        throw exception;
                    } finally {
                        $scope.clrWire.stopWriting($scope.clrWireConnector);
                        $scope.clrWire.registerReaderAndRead($scope.clrWireConnector);
                    }
                }
            };

            $scope.getConnectionPositions = function (bus) {
                var positions = [];
                var connections = $scope.register.getBuses();
                for (var i = 0; i < connections.length; i++) {
                    if (connections[i].bus === bus) {
                        if (i % 2 == 0) {
                            positions.push({top: $scope.top-19, left: $scope.left+33});
                        } else {
                            positions.push({top: $scope.top+48, left: $scope.left+33});
                        }
                    }
                }
                return positions;
            };

            $scope.getWireConnectionPositions = function (wire) {
                var positions = [];
                var connections = $scope.register.getBuses();
                for (var i = 0; i < connections.length; i++) {
                    if ((connections[i].writeWire) && (connections[i].writeWire === wire)) {
                        if (i % 2 == 0) {
                            positions.push({top: $scope.top-13, left: $scope.left+43});
                        } else {
                            positions.push({top: $scope.top+42, left: $scope.left+43});
                        }
                    }
                    if ((connections[i].readWire) && (connections[i].readWire === wire)) {
                        if (i % 2 == 0) {
                            positions.push({top: $scope.top-7, left: $scope.left+43});
                        } else {
                            positions.push({top: $scope.top+36, left: $scope.left+43});
                        }
                    }
                }
                if (($scope.register.incWire) && ($scope.register.incWire === wire)) {
                    positions.push({top: $scope.top+8, left: $scope.left+66});
                }
                if (($scope.register.decWire) && ($scope.register.decWire === wire)) {
                    positions.push({top: $scope.top+15, left: $scope.left+66});
                }
                if (($scope.register.clrWire) && ($scope.register.clrWire === wire)) {
                    positions.push({top: $scope.top+22, left: $scope.left+66});
                }
                return positions;
            };

            $scope.$watch('incWire', function (newWire, oldWire) {
                if (oldWire && (newWire != oldWire)) {
                    oldWire.resign($scope.incWireConnector);
                }
                if (newWire) {
                    $scope.incWireConnector = new ReadingControlWireConnector(
                        newWire,
                        function (wire) {
                            if (wire === $scope.incWire) {
                                $scope.register.inc();
                            }
                        },
                        function (wire) {},
                        $scope.registerName + ' inc wire connector'
                    );
                    newWire.enrollToDirective($scope.incWireConnector, $scope.getWireConnectionPositions);
                    newWire.registerReaderAndRead($scope.incWireConnector);
                }
                $scope.incWireInitialized = true;
                $scope.checkForFinishedInitialization();
            });

            $scope.$watch('decWire', function (newWire, oldWire) {
                if (oldWire && (newWire != oldWire)) {
                    oldWire.resign($scope.decWireConnector);
                }
                if (newWire) {
                    $scope.decWireConnector = new ReadingControlWireConnector(
                        newWire,
                        function (wire) {
                            if (wire === $scope.decWire) {
                                $scope.register.dec();
                            }
                        },
                        function (wire) {
                        },
                        $scope.registerName + ' dec wire connector'
                    );
                    newWire.enrollToDirective($scope.decWireConnector, $scope.getWireConnectionPositions);
                    newWire.registerReaderAndRead($scope.decWireConnector);
                }
                $scope.decWireInitialized = true;
                $scope.checkForFinishedInitialization();
            });

            $scope.$watch('clrWire', function (newWire, oldWire) {
                if (oldWire && (newWire != oldWire)) {
                    oldWire.resign($scope.clrWireConnector);
                }
                if (newWire) {
                    $scope.clrWireConnector = new ReadingControlWireConnector(
                        newWire,
                        function (wire) {
                            if (wire === $scope.clrWire) {
                                $scope.register.clr();
                            }
                        },
                        function (wire) {
                        },
                        $scope.registerName + ' clr wire connector'
                    );
                    newWire.enrollToDirective($scope.clrWireConnector, $scope.getWireConnectionPositions);
                    newWire.registerReaderAndRead($scope.clrWireConnector);
                }
                $scope.clrWireInitialized = true;
                $scope.checkForFinishedInitialization();
            });

            $scope.checkForFinishedInitialization = function () {
                if (($scope.controllerIsRead) &&
                    ($scope.incWireInitialized) &&
                    ($scope.decWireInitialized) &&
                    ($scope.clrWireInitialized)) {
                    $scope.$emit('componentInitialized', $scope.register);
                }
            };

            $scope.$on('sendInitialValues', function (event, message) {
                var connections = $scope.register.getBuses();
                for (var i = 0; i < connections.length; i++) {
                    for (var j = 0; j < $scope.connectionsInitialStates.length; j++) {
                        if (connections[i].bus === $scope.connectionsInitialStates[j].bus) {
                            var state = parseInt($scope.connectionsInitialStates[j].state);
                            if ((state === -1) || (state === 0) || (state === 1)) {
                                $scope.register.setState(connections[i], state);
                            }
                        }
                    }
                }
            });

            $scope.$on('gateRead', function (event, bus) {
                $scope.register.setToRead(bus);
                event.stopPropagation();
            });

            $scope.$on('gateReadDisconnected', function (event, bus) {
                $scope.register.setReadToDisconnected(bus);
                event.stopPropagation();
            });

            $scope.$on('gateWrite', function (event, bus) {
                $scope.register.setToWrite(bus);
                event.stopPropagation();
            });

            $scope.$on('gateWriteDisconnected', function (event, bus) {
                $scope.register.setWriteToDisconnected(bus);
                event.stopPropagation();
            });

            $scope.controllerIsRead = true;
            $scope.checkForFinishedInitialization();
        },
        templateUrl: '../../partials/component_Register.html'
    };
});

bonsaiApp.directive('gate', function () {
    return {
        require: '^register',
        restrict: 'E',
        scope: {
            bus: '=',
            setWrite: '=',
            setRead: '=',
            initialState: '='
        },
        link: function ($scope, element, attrs, registerCtrl) {
            registerCtrl.addBusConnection($scope.bus, $scope.setWrite, $scope.setRead, $scope.initialState);
        },
        template: ''
    };
});

