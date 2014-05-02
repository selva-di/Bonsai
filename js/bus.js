bonsaiApp.directive('bus', function () {
    return {
        restrict: 'E',
        scope: {
            handler: '='
        },
        link: function ($scope, element, attrs) {
            $scope.localHandler = $scope.handler || {};

            $scope.connections = [];

            $scope.value = null;
            $scope.active = false;
            $scope.writerIndex = -1;

            var findInConnections = function (enrollee) {
                var index = -1;
                for (var i = 0; i < $scope.connections.length; i++) {
                    if ($scope.connections[i].enrollee == enrollee) {
                        index = i;
                    }
                }
                return index;
            };

            var isInList = function (element, list) {
                for (var i = 0; i < list.length; i++) {
                    if (angular.equals(element, list[i])) {
                        return true;
                    }
                }
                return false;
            };

            var isInConnections = function (candidate, connections) {
                for (var i = 0; i < connections.length; i++) {
                    if (angular.equals(
                        candidate.connection,
                        connections[i].connection
                    )) {
                        return true;
                    }
                    if (angular.equals(
                        candidate.connection,
                        [connections[i].connection[1], connections[i].connection[0]]
                    )) {
                        return true;
                    }
                }
                return false;
            };

            var getEndpoints = function () {
                var endpoints = [];
                for (var i = 0; i < $scope.connections.length; i++) {
                    var connectionEndpoints = $scope.connections[i].getPositions($scope.localHandler);
                    for (var j = 0; j < connectionEndpoints.length; j++) {
                        endpoints.push(connectionEndpoints[j]);
                    }
                }
                return endpoints;
            };

            var getGrid = function (endpoints) {
                var XCoordinates = [];
                var YCoordinates = [];
                for (var i = 0; i < endpoints.length; i++) {
                    if (XCoordinates.indexOf(parseFloat(endpoints[i].left)) < 0) {
                        XCoordinates.push(parseFloat(endpoints[i].left));
                    }
                    if (YCoordinates.indexOf(parseFloat(endpoints[i].top)) < 0) {
                        YCoordinates.push(parseFloat(endpoints[i].top));
                    }
                }
                XCoordinates.sort(function (a, b) {
                    return a - b
                });
                YCoordinates.sort(function (a, b) {
                    return a - b
                });
                // create endpoints list by grid indexes
                var indexEndpoints = [];
                for (i = 0; i < endpoints.length; i++) {
                    indexEndpoints.push({
                        i: XCoordinates.indexOf(endpoints[i].left),
                        j: YCoordinates.indexOf(endpoints[i].top)
                    });
                }
                return {XCoordinates: XCoordinates, YCoordinates: YCoordinates, indexEndpoints: indexEndpoints};
            };

            var cluster = function (points, connections) {
                var clusters = [];
                for (var i = 0; i < connections.length; i++) {
                    var connectionAdded = false;
                    // Test if one of the connection point is already in one of the clusters and
                    // add the other point if it is not already in there.
                    var j = 0;
                    while (j < clusters.length) {
                        if (isInList(connections[i].connection[0], clusters[j]) && !connectionAdded) {
                            if (!isInList(connections[i].connection[1], clusters[j])) {
                                clusters[j].push(connections[i].connection[1]);
                                // check if we should merge clusters
                                var k = j+1;
                                while (k < clusters.length) {
                                    if (isInList(connections[i].connection[1], clusters[k])) {
                                        for (var l = 0; l < clusters[k].length; l++) {
                                            if (!isInList(clusters[k][l], clusters[j])) {
                                                clusters[j].push(clusters[k][l]);
                                            }
                                        }
                                        clusters.splice(k,1);
                                    }
                                    k++;
                                }
                            }
                            connectionAdded = true;
                        } else if (isInList(connections[i].connection[1], clusters[j]) && !connectionAdded) {
                            if (!isInList(connections[i].connection[0], clusters[j])) {
                                clusters[j].push(connections[i].connection[0]);
                                // check if we should merge clusters
                                k = j+1;
                                while (k < clusters.length) {
                                    if (isInList(connections[i].connection[0], clusters[k])) {
                                        for (l = 0; l < clusters[k].length; l++) {
                                            if (!isInList(clusters[k][l], clusters[j])) {
                                                clusters[j].push(clusters[k][l]);
                                            }
                                        }
                                        clusters.splice(k,1);
                                    }
                                    k++;
                                }
                            }
                            connectionAdded = true;
                        }
                        j++;
                    }
                    if (!connectionAdded) {
                        clusters.push([connections[i].connection[0], connections[i].connection[1]]);
                    }
                }
                // Check if all points are in a cluster and add a one point cluster for each which is not.
                for (i = 0; i < points.length; i++) {
                    var pointFound = false;
                    for (j = 0; j < clusters.length; j++) {
                        if (isInList(points[i], clusters[j])) {
                            pointFound = true;
                        }
                    }
                    if (!pointFound) {
                        clusters.push([points[i]]);
                    }
                }
                // Finished
                return clusters;
            };

            var getWaypointWeight = function (point, grid, waypoints, alreadyFoundConnections) {
                if (isInList(point, waypoints)) {
                    return 0.01;
                }
                var clusters = cluster(waypoints, alreadyFoundConnections);
                var weightSum = 0;
                for (var k = 0; k < clusters.length; k++) {
                    if (!isInList(point, clusters[k])) {
                        var clusterMinWeight = 1000;
                        for (var l = 0; l < clusters[k].length; l++) {
                            var weight = Math.sqrt(
                                (grid.XCoordinates[point.i] - grid.XCoordinates[clusters[k][l].i]) *
                                    (grid.XCoordinates[point.i] - grid.XCoordinates[clusters[k][l].i]) +
                                    (grid.YCoordinates[point.j] - grid.YCoordinates[clusters[k][l].j]) *
                                        (grid.YCoordinates[point.j] - grid.YCoordinates[clusters[k][l].j])
                            );
                            if (weight < clusterMinWeight) {
                                clusterMinWeight = weight;
                            }
                        }
                        weightSum = weightSum + clusterMinWeight;
                    }
                }
                return weightSum;
            };

            var findGoodConnections = function (alreadyFoundConnections, grid, waypoints) {
                // find all possible waypoint connections
                var possibleNewConnections = [];
                var connection;
                for (var k = 0; k < waypoints.length; k++) {
                    if (waypoints[k].i + 1 < grid.XCoordinates.length) {
                        connection = [
                            waypoints[k],
                            {i: waypoints[k].i + 1, j: waypoints[k].j}
                        ];
                        if (!isInConnections({connection: connection}, alreadyFoundConnections)) {
                            possibleNewConnections.push({
                                connection: connection,
                                dist: grid.XCoordinates[waypoints[k].i + 1] - grid.XCoordinates[waypoints[k].i],
                                weight: getWaypointWeight(
                                    {i: waypoints[k].i + 1, j: waypoints[k].j},
                                    grid,
                                    waypoints,
                                    alreadyFoundConnections
                                )
                            });
                        }
                    }
                    if (waypoints[k].i - 1 >= 0) {
                        connection = [
                            waypoints[k],
                            {i: waypoints[k].i - 1, j: waypoints[k].j}
                        ];
                        if (!isInConnections({connection: connection}, alreadyFoundConnections)) {
                            possibleNewConnections.push({
                                connection: connection,
                                dist: grid.XCoordinates[waypoints[k].i] - grid.XCoordinates[waypoints[k].i - 1],
                                weight: getWaypointWeight(
                                    {i: waypoints[k].i - 1, j: waypoints[k].j},
                                    grid,
                                    waypoints,
                                    alreadyFoundConnections
                                )
                            });
                        }
                    }
                    if (waypoints[k].j - 1 >= 0) {
                        connection = [
                            waypoints[k],
                            {i: waypoints[k].i, j: waypoints[k].j - 1}
                        ];
                        if (!isInConnections({connection: connection}, alreadyFoundConnections)) {
                            possibleNewConnections.push({
                                connection: connection,
                                dist: grid.YCoordinates[waypoints[k].j] - grid.YCoordinates[waypoints[k].j - 1],
                                weight: getWaypointWeight(
                                    {i: waypoints[k].i, j: waypoints[k].j - 1},
                                    grid,
                                    waypoints,
                                    alreadyFoundConnections
                                )
                            });
                        }
                    }
                    if (waypoints[k].j + 1 < grid.YCoordinates.length) {
                        connection = [
                            waypoints[k],
                            {i: waypoints[k].i, j: waypoints[k].j + 1}
                        ];
                        if (!isInConnections({connection: connection}, alreadyFoundConnections)) {
                            possibleNewConnections.push({
                                connection: connection,
                                dist: grid.YCoordinates[waypoints[k].j + 1] - grid.YCoordinates[waypoints[k].j],
                                weight: getWaypointWeight(
                                    {i: waypoints[k].i, j: waypoints[k].j + 1},
                                    grid,
                                    waypoints,
                                    alreadyFoundConnections
                                )
                            });
                        }
                    }
                }
                // sort the connections by weight
                possibleNewConnections.sort(function (a, b) {
                    return (a.weight * a.dist) - (b.weight * b.dist);
                });
                // remove duplicate connections
                for (var i = 0; i < possibleNewConnections.length; i++) {
                    if (isInConnections(possibleNewConnections[i], alreadyFoundConnections)) {
                        possibleNewConnections.splice(i, 1);
                    }
                }
                if (possibleNewConnections.length > 0) {
                    // select the connection with the smallest weight
                    alreadyFoundConnections.push(possibleNewConnections[0]);
                    // add the new waypoint
                    if (!isInList(possibleNewConnections[0].connection[0], waypoints)) {
                        waypoints.push(possibleNewConnections[0].connection[0]);
                    }
                    if (!isInList(possibleNewConnections[0].connection[1], waypoints)) {
                        waypoints.push(possibleNewConnections[0].connection[1]);
                    }
                    // recursively add the rest of the connections if necessary
                    var clusters = cluster(waypoints, alreadyFoundConnections);
                    if (clusters.length > 1) {
                        alreadyFoundConnections = findGoodConnections(alreadyFoundConnections, grid, waypoints);
                    }
                }
                return alreadyFoundConnections;
            };

            var getConnectionPartEndpoints = function (connections) {
                var endpoints = connections[0];
                for (var i = 1; i < connections.length; i++) {
                    if (angular.equals(endpoints[0], connections[i][0])) {
                        endpoints[0] = connections[i][1];
                    } else if (angular.equals(endpoints[0], connections[i][1])) {
                        endpoints[0] = connections[i][0];
                    } else if (angular.equals(endpoints[1], connections[i][0])) {
                        endpoints[1] = connections[i][1];
                    } else if (angular.equals(endpoints[1], connections[i][1])) {
                        endpoints[1] = connections[i][0];
                    }
                }
                return endpoints;
            };

            var constructConnectionParts = function (goodConnections) { //TODO: Rewrite this!
                var connectionParts = [];
                for (var i = 0; i < goodConnections.length; i++) {
                    console.log("  Connection Parts: ");
                    console.log(connectionParts);
                    for (var a = 0; a < connectionParts.length; a++) {
                        console.log("   "+printConnectionParts(connectionParts[a]));
                    }
                    console.log("  Connection Parts: END");
                    //try to append the connection to an existing part
                    var appendCandidatesPoints = [[], []];
                    for (var j = 0; j < connectionParts.length; j++) {
                        console.log("constructing...");
                        var connectionPartEndpoints = getConnectionPartEndpoints(connectionParts[j]);
                        if (angular.equals(goodConnections[i].connection[0], connectionPartEndpoints[0]) &&
                            ((goodConnections[i].connection[1].i == connectionPartEndpoints[0].i &&
                                ((goodConnections[i].connection[1].j > connectionPartEndpoints[0].j) ==
                                    (connectionPartEndpoints[0].j > connectionPartEndpoints[1].j))) ||
                             (goodConnections[i].connection[1].j == connectionPartEndpoints[0].j &&
                                ((goodConnections[i].connection[1].i > connectionPartEndpoints[0].i) ==
                                    (connectionPartEndpoints[0].i > connectionPartEndpoints[1].i))))) {
                            appendCandidatesPoints[1].push(j);
                        } else if (angular.equals(goodConnections[i].connection[0], connectionPartEndpoints[1]) &&
                            ((goodConnections[i].connection[1].i == connectionPartEndpoints[1].i &&
                                ((goodConnections[i].connection[1].j > connectionPartEndpoints[0].j) ==
                                    (connectionPartEndpoints[0].j > connectionPartEndpoints[1].j))) ||
                             (goodConnections[i].connection[1].j == connectionPartEndpoints[1].j &&
                                ((goodConnections[i].connection[1].i > connectionPartEndpoints[0].i) ==
                                    (connectionPartEndpoints[0].i > connectionPartEndpoints[1].i))))) {
                            appendCandidatesPoints[1].push(j);
                        } else if (angular.equals(goodConnections[i].connection[1], connectionPartEndpoints[0]) &&
                            ((goodConnections[i].connection[0].i == connectionPartEndpoints[0].i &&
                                ((goodConnections[i].connection[0].j > connectionPartEndpoints[0].j) ==
                                    (connectionPartEndpoints[0].j > connectionPartEndpoints[1].j))) ||
                             (goodConnections[i].connection[0].j == connectionPartEndpoints[0].j &&
                                ((goodConnections[i].connection[0].i > connectionPartEndpoints[0].i) ==
                                    (connectionPartEndpoints[0].i > connectionPartEndpoints[1].i))))) {
                            appendCandidatesPoints[0].push(j);
                        } else if (angular.equals(goodConnections[i].connection[1], connectionPartEndpoints[1]) &&
                            ((goodConnections[i].connection[0].i == connectionPartEndpoints[1].i &&
                                ((goodConnections[i].connection[0].j > connectionPartEndpoints[0].j) ==
                                    (connectionPartEndpoints[0].j > connectionPartEndpoints[1].j))) ||
                             (goodConnections[i].connection[0].j == connectionPartEndpoints[1].j &&
                                ((goodConnections[i].connection[0].i > connectionPartEndpoints[0].i) ==
                                    (connectionPartEndpoints[0].i > connectionPartEndpoints[1].i))))) {
                            appendCandidatesPoints[0].push(j);
                        }
                    }
                    var connectionAppended = false;
                    console.log(appendCandidatesPoints);
                    if (appendCandidatesPoints[0].length == 1) {
                        connectionParts[appendCandidatesPoints[0][0]].push([
                            {i: goodConnections[i].connection[0].i, j: goodConnections[i].connection[0].j},
                            {i: goodConnections[i].connection[1].i, j: goodConnections[i].connection[1].j}
                        ]);
                        connectionAppended = true;
                    } else if (appendCandidatesPoints[1].length == 1) {
                        connectionParts[appendCandidatesPoints[1][0]].push([
                            {i: goodConnections[i].connection[0].i, j: goodConnections[i].connection[0].j},
                            {i: goodConnections[i].connection[1].i, j: goodConnections[i].connection[1].j}
                        ]);
                        connectionAppended = true;
                    }
                    // no part found to append to? create new
                    if (!connectionAppended) {
                        console.log('not appended');
                        console.log(connectionParts);
                        console.log(goodConnections[i].connection);
                        connectionParts.push([
                            [{i: goodConnections[i].connection[0].i, j: goodConnections[i].connection[0].j},
                             {i: goodConnections[i].connection[1].i, j: goodConnections[i].connection[1].j}]
                        ]);
                        console.log(" "+printConnectionParts(connectionParts[connectionParts.length-1]));
                    }
                }
                return connectionParts;
            };

            var constructParts = function (connectionParts, grid) {
                var parts = [];
                for (var k = 0; k < connectionParts.length; k++) {
                    var connectionPart = connectionParts[k];
                    // calculate min and max for the coordinates
                    var Xmin = 1000.0;
                    var Ymin = 1000.0;
                    var Xmax = 0.0;
                    var Ymax = 0.0;
                    var indexXmin = 1000;
                    var indexYmin = 1000;
                    var indexXmax = 0;
                    var indexYmax = 0;
                    for (var i = 0; i < connectionPart.length; i++) {
                        Xmin = Math.min(
                            grid.XCoordinates[connectionPart[i][0].i],
                            grid.XCoordinates[connectionPart[i][1].i],
                            Xmin
                        );
                        Ymin = Math.min(
                            grid.YCoordinates[connectionPart[i][0].j],
                            grid.YCoordinates[connectionPart[i][1].j],
                            Ymin
                        );
                        Xmax = Math.max(
                            grid.XCoordinates[connectionPart[i][0].i],
                            grid.XCoordinates[connectionPart[i][1].i],
                            Xmax
                        );
                        Ymax = Math.max(
                            grid.YCoordinates[connectionPart[i][0].j],
                            grid.YCoordinates[connectionPart[i][1].j],
                            Ymax
                        );
                        indexXmin = Math.min(connectionPart[i][0].i, connectionPart[i][1].i, indexXmin);
                        indexYmin = Math.min(connectionPart[i][0].j, connectionPart[i][1].j, indexYmin);
                        indexXmax = Math.max(connectionPart[i][0].i, connectionPart[i][1].i, indexXmax);
                        indexYmax = Math.max(connectionPart[i][0].j, connectionPart[i][1].j, indexYmax);
                    }
                    // determine the type
                    if (indexXmax == indexXmin) {
                        parts.push({
                            type: 'vertical',
                            top: Ymin+'em',
                            left: Xmin+'em',
                            width: '0',
                            height: (Ymax-Ymin)+'em'
                        });
                    } else if (indexYmax == indexYmin) {
                        parts.push({
                            type: 'horizontal',
                            top: Ymin+'em',
                            left: Xmin+'em',
                            width: (Xmax-Xmin)+'em',
                            height: '0'
                        });
                    } else { // the part must be a corner
                        var corners = {topleft: false, topright: false, bottomright: false, bottomleft: false};
                        for (i = 0; i < connectionPart.length; i++) {
                            if ((connectionPart[i][0].i == indexXmin && connectionPart[i][0].j == indexYmin) ||
                                (connectionPart[i][1].i == indexXmin && connectionPart[i][1].j == indexYmin)) {
                                corners.topleft = true;
                            }
                            if ((connectionPart[i][0].i == indexXmax && connectionPart[i][0].j == indexYmin) ||
                                (connectionPart[i][1].i == indexXmax && connectionPart[i][1].j == indexYmin)) {
                                corners.topright = true;
                            }
                            if ((connectionPart[i][0].i == indexXmax && connectionPart[i][0].j == indexYmax) ||
                                (connectionPart[i][1].i == indexXmax && connectionPart[i][1].j == indexYmax)) {
                                corners.bottomright = true;
                            }
                            if ((connectionPart[i][0].i == indexXmin && connectionPart[i][0].j == indexYmax) ||
                                (connectionPart[i][1].i == indexXmin && connectionPart[i][1].j == indexYmax)) {
                                corners.bottomright = true;
                            }
                        }
                        if (corners.bottomleft && corners.topleft && corners.topright) {
                            parts.push({
                                type: 'topleft',
                                top: Ymin+'em',
                                left: Xmin+'em',
                                width: (Xmax-Xmin)+'em',
                                height: (Ymax-Ymin)+'em'
                            });
                        } else if (corners.topleft && corners.topright && corners.bottomright) {
                            parts.push({
                                type: 'topright',
                                top: Ymin+'em',
                                left: Xmin+'em',
                                width: (Xmax-Xmin)+'em',
                                height: (Ymax-Ymin)+'em'
                            });
                        } else if (corners.topright && corners.bottomright && corners.bottomleft) {
                            parts.push({
                                type: 'bottomright',
                                top: Ymin+'em',
                                left: Xmin+'em',
                                width: (Xmax-Xmin)+'em',
                                height: (Ymax-Ymin)+'em'
                            });
                        } else {
                            parts.push({
                                type: 'bottomleft',
                                top: Ymin+'em',
                                left: Xmin+'em',
                                width: (Xmax-Xmin)+'em',
                                height: (Ymax-Ymin)+'em'
                            });
                        }
                    }
                }
                return parts;
            };

            var printConnections = function (connections) {
                var string = "";
                for (var i = 0; i < connections.length; i++) {
                    string = string + "(" + connections[i].connection[0].i + ", " + connections[i].connection[0].j +
                        ") -> (" + connections[i].connection[1].i + ", " + connections[i].connection[1].j + "), ";
                }
                return string;
            };

            var printConnectionParts = function (connections) {
                var string = "";
                for (var i = 0; i < connections.length; i++) {
                    string = string + "(" + connections[i][0].i + ", " + connections[i][0].j +
                        ") -> (" + connections[i][1].i + ", " + connections[i][1].j + "), ";
                }
                return string;
            };

            var printConnectionsWithWeights = function (connections) {
                var string = "";
                for (var i = 0; i < connections.length; i++) {
                    string = string + "(" + connections[i].connection[0].i + ", " + connections[i].connection[0].j +
                        ") -> (" + connections[i].connection[1].i + ", " + connections[i].connection[1].j + ") {d: " +
                        connections[i].dist + ", w: " + connections[i].weight + "}, ";
                }
                return string;
            };

            var printPoints = function (points) {
                var string = "";
                for (var i = 0; i < points.length; i++) {
                    string = string + "(" + points[i].i + ", " + points[i].j + "), ";
                }
                return string;
            };

            var updateVisibleParts = function () {
                console.log("_____________________");
                // get all endpoints
                var endpoints = getEndpoints();
                // get the grid
                var grid = getGrid(endpoints);
                // recursively find all good connections in the grid
                var goodConnections = findGoodConnections([], grid, grid.indexEndpoints);
                console.log(printConnections(goodConnections));
                // combine connections to parts
                var connectionParts = constructConnectionParts(goodConnections);
                console.log("FINAL PRINT Connection Parts:");
                for (var i = 0; i < connectionParts.length; i++) {
                    console.log(printConnectionParts(connectionParts[i]));
                }
                // set the parts
                $scope.visibleParts = constructParts(connectionParts, grid);
                console.log($scope.visibleParts);
            };

            $scope.localHandler.enroll = function (enrollee, callback, getPositions) {
                $scope.connections.push({
                    enrollee: enrollee,
                    is_reading: false,
                    callback: callback,
                    getPositions: getPositions
                });
                updateVisibleParts();
            };

            $scope.localHandler.resign = function (resigner) {
                var index = findInConnections(resigner);
                if (index >= 0) {
                    $scope.connections.splice(index, 1);
                }
            };

            $scope.localHandler.registerMovement = function () {
                updateVisibleParts()
            };

            $scope.localHandler.startReading = function (reader) {
                var index = findInConnections(reader);
                if (index >= 0) {
                    $scope.connections[index].is_reading = true;
                    return $scope.value;
                } else {
                    throw reader + " is not enrolled to the bus an can not read.";
                }
            };

            $scope.localHandler.stopReading = function (reader) {
                var index = findInConnections(reader);
                if (index >= 0) {
                    $scope.connections[index].is_reading = false;
                }
            };

            $scope.localHandler.write = function (writer, data) {
                var index = findInConnections(writer);
                if (index >= 0) {
                    if ($scope.active && $scope.writerIndex != index) {
                        throw "This bus is already occupied by " +
                            $scope.connections[$scope.writerIndex].enrollee + ".";
                    } else {
                        $scope.connections[index].is_reading = false;
                        $scope.writerIndex = index;
                        $scope.active = true;
                        $scope.value = data;
                        for (var i = 0; i < $scope.connections.length; i++) {
                            if ($scope.connections[i].is_reading) {
                                $scope.connections[i].callback($scope.value);
                            }
                        }
                    }
                } else {
                    throw writer + " is not enrolled to the bus an can not write.";
                }
            };

            $scope.localHandler.stopWriting = function (writer) {
                var index = findInConnections(writer);
                if (index >= 0) {
                    if (index == $scope.writerIndex) {
                        $scope.active = false;
                        $scope.writerIndex = -1;
                        $scope.value = null;
                    }
                }
            };
        },
        templateUrl: 'partials/component_Bus.html'
    }
});