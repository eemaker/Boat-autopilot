app.controller("PointToPoint", function($scope, $http, dataHolder, leafletMarkerEvents, $interval, $timeout) {

  setup = function() {

    if ($scope.Cached_data_.action_state_p2p_ == undefined) {
      $scope.Cached_data_.action_state_p2p_ = 0;
    }

    if ($scope.Cached_data_.action_p2p_ == undefined) {
      $scope.Cached_data_.action_p2p_ = {
        text_: "Calculate Path",
        class_: "btn-warning",
        icon_: "glyphicon glyphicon-flash"
      }
    }

    if ($scope.Cached_data_.ETE_ == undefined) {
      $scope.Cached_data_.ETE_ = {
        progress_: 0,
        time_: "",
        class_: "active"
      }
    }

    //Must be declared before running setup
    //Setup what events are allowed on the map
    if ($scope.Cached_data_.events_ == undefined) {
      $scope.Cached_data_.events_ = {
        map: {
          enable: ["click"],
          logic: "emit"
        }
      }
    }

    //Center map to null island
    if ($scope.Cached_data_.map_center_ == undefined) {
      $scope.Cached_data_.map_center_ = {
        lat: 0,
        lng: 0,
        zoom: 0,
      }
    }

    //Loading the target icon
    $scope.Cached_data_.target_icon_ = {
      iconUrl: "images/target.png",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }

    //Loading the boat icon
    $scope.Cached_data_.boat_icon_ = {
      iconUrl: "images/boat.png",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }

    //Setting up the markers_p2p_
    if ($scope.Cached_data_.markers_p2p_ == undefined) {
      $scope.Cached_data_.markers_p2p_ = new Array();
      //Marker 1 is the target marker, set up to be invisible at 0 0
      $scope.Cached_data_.markers_p2p_[1] = {
        lat: 0,
        lng: 0,
        icon: $scope.Cached_data_.target_icon_,
        opacity: 0,
        draggable: true
      }
    }
    //Boat marker, set to the boats current position
    $scope.Cached_data_.markers_p2p_[0] = {
      lat: 0,
      lng: 0,
      icon: $scope.Cached_data_.boat_icon_,
      iconAngle: $scope.Cached_data_.Boat_pose_.orientation_,
      opacity: 1,
    }
  }

  setupMap = function() {
    //Set up map center
    $scope.Cached_data_.map_center_ = {
      lat: $scope.Cached_data_.Boat_pose_.latitude_,
      lng: $scope.Cached_data_.Boat_pose_.longitude_,
      zoom: 14
    };

    //Setup map controls, scale
    $scope.map_controls_ = {
      scale: true
    }

    //Boat marker, set to the boats current position
    $scope.Cached_data_.markers_p2p_[0] = {
      lat: $scope.Cached_data_.Boat_pose_.latitude_,
      lng: $scope.Cached_data_.Boat_pose_.longitude_,
      icon: $scope.Cached_data_.boat_icon_,
      iconAngle: $scope.Cached_data_.Boat_pose_.orientation_,
      opacity: 1,
    }
  }

  $scope.$on("leafletDirectiveMap.click", function(event, args) {
    updateEndCoord(args.leafletEvent.latlng);
  });

  $scope.$on("leafletDirectiveMarker.drag", function(event, args) {
    let point = args.leafletEvent.target._leaflet_events.drag[0].context._latlng;
    updateEndCoord(point);
  });

  updateEndCoord = function(end_coord) {
    if (end_coord.lat != undefined) {
      $scope.Cached_data_.markers_p2p_[1].lat = end_coord.lat;
    }
    if (end_coord.lng != undefined) {
      $scope.Cached_data_.markers_p2p_[1].lng = end_coord.lng;
    }
    $scope.Cached_data_.markers_p2p_[1].opacity = 1;
  };

  updateBoatPose = function(pose) {
    $scope.Cached_data_.Boat_pose_ = pose;
    //Boat marker, set to the boats current position
    $scope.Cached_data_.markers_p2p_[0].lat = pose.latitude_
    $scope.Cached_data_.markers_p2p_[0].lng = pose.longitude_
    $scope.Cached_data_.markers_p2p_[0].iconAngle = pose.orientation_
  }

  $scope.Action = function() {
    switch ($scope.Cached_data_.action_state_p2p_) {
      case 0: //User presses Calculate path
        //Check if a marker has been placed
        if ($scope.Cached_data_.markers_p2p_[1].opacity != 0) {
          $scope.target_missing = false;
          $scope.Cached_data_.ETE_.progress_p2p_ = 0;
          $scope.Cached_data_.ETE_.time_p2p = "";
          $scope.Cached_data_.ETE_.class_p2p = "active";
          $scope.Cached_data_.action_p2p_ = {
            text_: "Calculating ",
            class_: "btn-warning disabled",
            icon_: "fa fa-spinner fa-spin"
          };

          calculatePath($scope.Cached_data_.markers_p2p_[1]);

        } else {
          //No marker has been placed
          $scope.target_missing = true;
        }
        break;
      case 1: //Change icon to indicate that a path has been received
        $scope.Cached_data_.action_p2p_ = {
          text_: "Start ",
          class_: "btn-success",
          icon_: "glyphicon glyphicon-play"
        }
        $scope.Cached_data_.action_state_p2p_ = 2
        break;
      case 2: //User presses Start, to begin traversing the path
        $scope.Cached_data_.action_p2p_ = {
          text_: "Running",
          class_: "btn-success disabled",
          icon_: "fa fa-spinner fa-spin"
        }

        start();

        break;
      case 3: //The path has been traversed successfully
        $scope.Cached_data_.action_p2p_ = {
          text_: "Calculate Path",
          class_: "btn-warning",
          icon_: "glyphicon glyphicon-flash"
        }
        $scope.Cached_data_.ETE_.class_p2p_ = "progress-bar-success"
        $scope.Cached_data_.action_state_p2p_ = 0
        break;
    }
  }

  //Send command to navigation unit
  calculatePath = function(end_coord) {
    saveToFile("toNav", {
      "func_": "calcP2P",
      "target_position_": {
        latitude_: end_coord.lat,
        longitude_: end_coord.lng
      }
    });
    //Wait for navigation unit to send a new path
    waitForPath();
    //Return when the Path object has been updated by the controller
  }

  waitForPath = function() {
    let current_timestamp = $scope.Cached_data_.Path_.timestamp_;
    $scope.waitForPathPromise = $interval(function() {
      getDataFromNav("../savedData/fromNav.json");
      $http.get("../savedData/fromNav.json").then(function(response) {
        $scope.Cached_data_.Path_ = response.data.Path_;
        if (current_timestamp < $scope.Cached_data_.Path_.timestamp_) {
          $interval.cancel($scope.waitForPathPromise);
          $scope.Cached_data_.action_state_p2p_ = 1;

          $scope.Action();
        }
      });
    }, 1000); //Update frequency for the boat data
  }

  //Send command to navigation unit
  start = function() {
    saveToFile("toNav", {
      "func_": "start"
    });
    //Wait for navigation unit to send a new path
    waitForCompletion()
    //Return when the path has been traversed
  }

  waitForCompletion = function() {
    $scope.Cached_data_.ETE_.time_p2p_ = "Calculating ...";
    $scope.waitForCompletionPromise = $interval(function() {
      if ($scope.Cached_data_.ETE_.progress_p2p_ >= 100) {
        $scope.Cached_data_.ETE_.time_p2p_ = "Arrived at target";
        $scope.Cached_data_.ETE_.class_p2p_ = "progress-bar-success"
        $scope.Cached_data_.action_state_p2p_ = 3;
        $scope.Action()
        $interval.cancel($scope.waitForCompletionPromise);
      } else {
        getDataFromNav("../savedData/fromNav.json");
        $http.get("../savedData/fromNav.json").then(function(response) {
          $scope.Cached_data_.ETE_.progress_p2p_ = response.data.Progress_
        })
      }
    }, 1000)
  }

  $scope.Stop = function() {
    //Reset action state and destroy both waiting promises if they exist
    $scope.Cached_data_.action_state_p2p_ = 0;
    if ($scope.waitForPathPromise) {
      $interval.cancel($scope.waitForPathPromise);
    }
    if ($scope.waitForCompletionPromise) {
      $interval.cancel($scope.waitForCompletionPromise);
    }
    $timeout.cancel($scope.p2ptimeout);
    $scope.Cached_data_.action_p2p_ = {
      text_: "Calculate Path",
      class_: "btn-warning",
      icon_: "glyphicon glyphicon-flash"
    }

    //Update command file
    saveToFile("toNav", {
      "func_": "stop"
    });

    $scope.Cached_data_.action_state_p2p_ = 0
    $scope.Cached_data_.ETE_.time_p2p_ = "Canceled";
    $scope.Cached_data_.ETE_.class_p2p_ = "progress-bar-danger"
  }

  getDataFromNav = function(path) {
    return $http.get(path).then(function(response) {
      //Parse fromNav.json, add telemetry data
      updateBoatPose(response.data.Telemetry_);
      $scope.Cached_data_.Path_ = response.data.Path_;
    }).catch(function(data) {
      $scope.Cached_data_.Boat_pose_ = {
        //Default boat position, for testing purposes
        latitude_: 0,
        longitude_: 0,
        orientation_: 0
      };
    });
  }

  //Save function, saves command names and their associated data for the navigation unit to read
  saveToFile = function(url, content) {
    $http.post(url, angular.toJson(content)). //Build a http POST call with the url and content
    then(function(data, status, headers, config) {}) //No error handling
  }

  //Program start, set dataHolder
  $scope.Cached_data_ = dataHolder;

  //Setup p2p
  setup();
  //Get data from nav and run setup when it"s loaded
  getDataFromNav("../savedData/fromNav.json").then(function() {
    setupMap();
  });

  //Main loop polls fromNav.json
  let main_promise = $interval(function() {
    getDataFromNav("../savedData/fromNav.json");
  }, 1000); //Update frequency for the boat data

  $scope.$on('$destroy', function() {
    //Destroy fromNav.json poll from p2p site when site is changed
    if (main_promise)
      $interval.cancel(main_promise);
  });
});
