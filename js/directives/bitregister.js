'use strict';

bonsaiApp.directive('bitregister', function ($interval) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            value: '=',
            setWiresRead: '=',
            setWiresWrite: '=',
            registerName: '@',
            top: '=',
            left: '='
        },
        controller: function ($scope) {
            $scope.dataChangeCallback = function (newValue) {
                $scope.value = newValue;
            };

            $scope.wideGateState = 0;
            $scope.wireRead = true;
            $scope.wideBusStateChangeCallback = function (newStateValue) {
                if (!($scope.gateColorIteration > 0)) {
                    $scope.wideGateState = newStateValue;
                }
            };
            $scope.gateColor = 'rgb(200, 200, 200)';
            $scope.gateColorIteration = 0;

            $scope.register = new BitRegister(
                $scope.dataChangeCallback,
                $scope.registerName,
                $scope.value,
                $scope.wideBusStateChangeCallback
            );

            this.setBusConnection = function (bus, setWrite, setRead, initialState) {
                $scope.register.setWideBusConnection(bus, setWrite, setRead);
                if (bus) {
                    bus.enrollToDirective(
                        $scope.register,
                        $scope.getConnectionPositions
                    );
                }
                if (setWrite) {
                    var writeWireConnector = new ReadingControlWireConnector(setWrite,
                        function (wire) {
                            $scope.register.setToWrite(wire);
                        },
                        function (wire) {
                            $scope.register.setToDisconnected(wire);
                        }, $scope.registerName + ' write wire connector for bus ' + bus.getName());
                    $scope.register.getWideBusConnection().writeWireConnector = writeWireConnector;
                    setWrite.enrollToDirective(
                        writeWireConnector,
                        $scope.getWireConnectionPositions);
                    setWrite.registerReaderAndRead(writeWireConnector);
                }
                if (setRead) {
                    var readWireConnector = new ReadingControlWireConnector(setRead,
                        function (wire) {
                            $scope.register.setWideBusGateToRead();
                            $interval(function () {
                                $scope.register.setWideBusGateToDisconnected(wire);
                            }, 0, 1);
                        },
                        function () {
                        }, $scope.registerName + ' read wire connector for bus ' + bus.getName());
                    $scope.register.getWideBusConnection().readWireConnector = readWireConnector;
                    setRead.enrollToDirective(readWireConnector, $scope.getWireConnectionPositions);
                    setRead.registerReaderAndRead(readWireConnector);
                }
                initialState = parseInt(initialState);
                if (!initialState) {
                    initialState = 0;
                }
                if (initialState < 0) {
                    initialState = -1;
                } else if (initialState > 0) {
                    initialState = 1;
                }
                $scope.initialWideBusGateState = initialState;
            };

            this.addWireConnection = function (wire) {
                var connection = $scope.register.addWireConnection(wire);
                if (wire) {
                    connection.connector = new ReadingControlWireConnector(wire,
                        function (wire) {
                            if ($scope.register.bitWiresConnection.state == -1) {
                                if (wire.isActive() && wire.isNotZero()) {
                                    var allWires = $scope.register.getWires();
                                    for (var k = 0; k < allWires.length; k++) {
                                        if (allWires[k].wire === wire) {
                                            $scope.register.setBit(k, 1);
                                        }
                                    }
                                }
                            }
                        },
                        function (wire) {
                            if ($scope.register.bitWiresConnection.state == -1) {
                                var allWires = $scope.register.getWires();
                                for (var k = 0; k < allWires.length; k++) {
                                    if (allWires[k].wire === wire) {
                                        $scope.register.setBit(k, 0);
                                    }
                                }
                            }
                        }, $scope.registerName + ' bit connector no ' + $scope.register.getWires().length + ' for ' + wire.getName());
                    wire.enrollToDirective(
                        connection.connector,
                        $scope.getWireConnectionPositions
                    );
                    wire.registerReaderAndRead(connection.connector);
                }
            };
        },
        link: function ($scope, element, attrs) {
            $scope.$watch('top', function () {
                $scope.topCSS = $scope.top + 'px';
            });
            $scope.$watch('left', function () {
                $scope.leftCSS = ($scope.left + 16) + 'px';
            });

            $scope.setWiresWires = function () {
                $scope.register.setBitConnectionControlWires($scope.setWiresRead, $scope.setWiresWrite);
            };
            $scope.$watch('setWiresRead', $scope.setWiresWires);
            $scope.$watch('setWiresWrite', $scope.setWiresWires);

            attrs.$observe('registerName', function() {
                if ($scope.registerName) {
                    $scope.register.setName($scope.registerName);
                }
            });

            $scope.$watch('wideGateState', function (newState) {
                if (newState === -1) {
                    $scope.gateColor = 'rgb(122, 222, 103)';
                    $scope.gateColorIteration = 20;
                    $interval(function () {
                        $scope.gateColor =
                            'rgb(' + Math.floor(122 + (200 - 122) * (20 - $scope.gateColorIteration) / 20) +
                            ', ' + Math.floor((222 - 200) * $scope.gateColorIteration / 20 + 200) +
                            ', ' + Math.floor(103 + (200 - 103) * (20 - $scope.gateColorIteration) / 20) + ')';
                        if ($scope.gateColorIteration <= 0) {
                            $scope.register.setWideBusState(0);
                        }
                        $scope.gateColorIteration--;
                    }, 30, 21);
                } else if (newState === 1) {
                    $scope.gateColor = 'rgb(255, 103, 97)';
                } else {
                    $scope.gateColor = 'rgb(200, 200, 200)';
                }
            });

            $scope.$watch('value', function(newValue) {
                if (typeof newValue != 'undefined') {
                    if (newValue != $scope.register.getValue()) {
                        $scope.register.setValue(newValue);
                    }
                }
            });

            $scope.$watch('setWiresRead', function (newWire, oldWire) {
                if (oldWire && (newWire != oldWire)) {
                    oldWire.resign($scope.register.bitWiresConnection.readWireConnector);
                }
                if (newWire) {
                    $scope.register.bitWiresConnection.readWireConnector = new ReadingControlWireConnector(
                        newWire,
                        function (wire) {
                            if (wire.isActive() && wire.isNotZero()) {
                                $scope.register.setBitGateToRead();
                            }
                        },
                        function () {
                            if (!($scope.register.bitWiresConnection.writeWire.isActive() &&
                                $scope.register.bitWiresConnection.writeWire.isNotZero())) {
                                $scope.register.setBitGateToDisconnected();
                            }
                        },
                        $scope.registerName + ' read wire connector for bit connections'
                    );
                    newWire.enrollToDirective(
                        $scope.register.bitWiresConnection.readWireConnector,
                        $scope.getWireConnectionPositions
                    );
                    $scope.register.bitWiresConnection.readWire.registerReaderAndRead(
                        $scope.register.bitWiresConnection.readWireConnector
                    );
                }
            });

            $scope.$watch('setWiresWrite', function (newWire, oldWire) {
                if (oldWire && (newWire != oldWire)) {
                    oldWire.resign($scope.register.bitWiresConnection.writeWireConnector);
                }
                if (newWire) {
                    $scope.register.bitWiresConnection.writeWireConnector = new ReadingControlWireConnector(
                        newWire,
                        function (wire) {
                            if (wire.isActive() && wire.isNotZero()) {
                                $scope.register.setBitGateToWrite();
                            }
                        },
                        function () {
                            if (!($scope.register.bitWiresConnection.readWire.isActive() &&
                                $scope.register.bitWiresConnection.readWire.isNotZero())) {
                                $scope.register.setBitGateToDisconnected();
                            }
                        },
                        $scope.registerName + ' write wire connector for bit connections'
                    );
                    newWire.enrollToDirective(
                        $scope.register.bitWiresConnection.writeWireConnector,
                        $scope.getWireConnectionPositions
                    );
                    $scope.register.bitWiresConnection.writeWire.registerReaderAndRead(
                        $scope.register.bitWiresConnection.writeWireConnector
                    );
                }
            });

            $scope.getBits = function () {
                var bits = [];
                for (var i = 0; i < $scope.register.getWires().length; i++) {
                    bits.push($scope.register.getBit(i));
                }
                return bits;
            };

            $scope.setWideBusState = function (desiredState) {
                window.getSelection().removeAllRanges(); // Hack to unselect the arrows to keep the color visible.
                $scope.register.setWideBusState(desiredState);
            };

            $scope.activateWireRead = function () {
                $scope.register.setBitGateToRead();
            };

            $scope.deactivateWireRead = function () {
                $scope.register.setBitGateToDisconnected();
            };

            $scope.activateWireWrite = function ($event) {
                if ($event) { $event.preventDefault(); }
                $scope.register.setBitGateToWrite();
            };

            $scope.deactivateWireWrite = function () {
                $scope.register.setBitGateToDisconnected();
            };

            $scope.activateWriteWire = function ($event) {
                if ($event) { $event.preventDefault(); }
                var connection = $scope.register.getWideBusConnection();
                if (connection.writeWire) {
                    connection.writeWire.unregisterReader(connection.writeWireConnector);
                    try {
                        connection.writeWire.write(connection.writeWireConnector, 1);
                        $scope.setState(1);
                    } catch (exception) {
                        connection.writeWire.registerReaderAndRead(connection.writeWireConnector);
                        throw exception;
                    }
                } else {
                    $scope.setWideBusState(1);
                }
            };

            $scope.deactivateWriteWire = function () {
                var connection = $scope.register.getWideBusConnection();
                if (connection.writeWire) {
                    try {
                        connection.writeWire.write(connection.writeWireConnector, 0);
                    } catch (exception) {
                        throw exception;
                    } finally {
                        connection.writeWire.stopWriting(connection.writeWireConnector);
                        connection.writeWire.registerReaderAndRead(connection.writeWireConnector);
                    }
                }
                $scope.setWideBusState(0);
            };

            $scope.activateReadWire = function ($event) {
                if ($event) { $event.preventDefault(); }
                var connection = $scope.register.getWideBusConnection();
                if (connection.readWire) {
                    connection.readWire.unregisterReader(connection.readWireConnector);
                    try {
                        connection.readWire.write(connection.readWireConnector, 1);
                        $scope.setWideBusState(-1);
                        $interval(function () {
                            connection.readWire.write(connection.readWireConnector, 0);
                            connection.readWire.stopWriting(connection.readWireConnector);
                            connection.readWire.registerReaderAndRead(connection.readWireConnector);
                            $scope.setWideBusState(0);
                        }, 0, 1);
                    } catch (exception) {
                        connection.readWire.registerReaderAndRead(connection.readWireConnector);
                        throw exception;
                    }
                } else {
                    $scope.setWideBusState(-1);
                    $interval(function () {
                        $scope.setWideBusState(0);
                    }, 0, 1);
                }
            };

            $scope.toggleWideBusState = function () {
                var stateFound = false;
                var desiredState = $scope.register.wideBusConnection.state + 1;
                while (!stateFound) {
                    if (desiredState > 1) {
                        desiredState = -1;
                    }
                    try {
                        $scope.setWideBusState(desiredState);
                        stateFound = true;
                    } catch (exception) {
                        desiredState++;
                    }
                }
            };

            $scope.toggleBitConnectionState = function () {
                var stateFound = false;
                var desiredState = $scope.register.bitWiresConnection.state - 1;
                while (!stateFound) {
                    if (desiredState < -1) {
                        desiredState = 1;
                    }
                    try {
                        $scope.register.setBitConnectionState(desiredState);
                        stateFound = true;
                    } catch (exception) {
                        desiredState--;
                    }
                }
            };

            $scope.activateBit = function (index, $event) {
                if ($event) { $event.preventDefault(); }
                var wires = $scope.register.getWires();
                if ((wires.length > index) && (wires[index].wire)) {
                    wires[index].wire.unregisterReader(wires[index].connector);
                    try {
                        wires[index].wire.write(wires[index].connector, 1);
                        $scope.register.setBit(index, 1);
                    } catch (exception) {
                        wires[index].wire.registerReaderAndRead(wires[index].connector);
                        throw exception;
                    }
                } else {
                    $scope.register.setBit(index, ($scope.register.getBit(index) + 1) % 2);
                }
            };

            $scope.deactivateBit = function (index) {
                var wires = $scope.register.getWires();
                if ((wires.length > index) && (wires[index].wire)) {
                    try {
                        wires[index].wire.write(wires[index].connector, 0);
                        $scope.register.setBit(index, 0);
                    } catch (exception) {
                        throw exception;
                    } finally {
                        wires[index].wire.stopWriting(wires[index].connector);
                        wires[index].wire.registerReaderAndRead(wires[index].connector);
                    }
                }
            };

            $scope.toggleBit = function (index) {
                $scope.register.setBit(index, ($scope.register.getBit(index) + 1) % 2)
            };

            $scope.getConnectionPositions = function () {
                return [{top: $scope.top-19, left: $scope.left+31}];
            };

            $scope.getWireConnectionPositions = function (wire) {
                var positions = [];
                var connection = $scope.register.getWideBusConnection();
                if ((connection.writeWire) && (connection.writeWire === wire)) {
                    positions.push({top: $scope.top-11, left: $scope.left+40});
                }
                if ((connection.readWire) && (connection.readWire === wire)) {
                    positions.push({top: $scope.top-5, left: $scope.left+40});
                }
                if (($scope.register.bitWiresConnection.writeWire) &&
                    ($scope.register.bitWiresConnection.writeWire === wire)) {
                    positions.push({top: $scope.top+2, left: $scope.left+5});
                }
                if (($scope.register.bitWiresConnection.readWire) &&
                    ($scope.register.bitWiresConnection.readWire === wire)) {
                    positions.push({top: $scope.top+2, left: $scope.left+13});
                }
                var bitWires = $scope.register.getWires();
                for (var i = 0; i < bitWires.length; i++) {
                    if ((bitWires[i].wire) && (bitWires[i].wire === wire)) {
                        positions.push({top: $scope.top+12+i*12, left: $scope.left-2});
                    }
                }
                return positions;
            };

            $scope.$on('sendInitialValues', function (event, message) {
                $scope.register.setWideBusState($scope.initialWideBusGateState);
            });

            $scope.$emit('componentInitialized', $scope.register);
        },
        templateUrl: 'partials/component_BitRegister.html'
    };
});

bonsaiApp.directive('widegate', function () {
    return {
        require: '^bitregister',
        restrict: 'E',
        scope: {
            bus: '=',
            setWrite: '=',
            setRead: '=',
            initialState: '='
        },
        link: function ($scope, element, attrs, registerCtrl) {
            registerCtrl.setBusConnection($scope.bus, $scope.setWrite, $scope.setRead, $scope.initialState);
        },
        template: ''
    };
});

bonsaiApp.directive('wiregate', function () {
    return {
        require: '^bitregister',
        restrict: 'E',
        scope: {
            wire: '='
        },
        link: function ($scope, element, attrs, registerCtrl) {
            registerCtrl.addWireConnection($scope.wire);
        },
        template: ''
    };
});

