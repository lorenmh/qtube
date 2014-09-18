// tie player element name to the directive!

/*///////////////////////////////////////////////
NOTES AND ODD SHIT

@suggestions:
- Input is throttled to one get request each 200 ms
- Once the request is returned, the results are throttled to 500ms.
this means:
- Every 200ms that a user inputs it will make one request
- The suggestions will update at most once per 500ms.



/*///////////////////////////////////////////////

var player = angular.module('player', []);

// the YouTube API player element's ID
// right now this value is hardcoded into the player directive.  Need to find
// a way to have this value automatically inserted.
var playerId = 'qt-player';

/* ytConfig: Value
 * holds the configuration values for the YouTube API
 */
player.value('ytConfig', {
  elId: playerId,
  width: '640',
  height: '360',
  playerVars: {
    controls: 0,
    autoplay: 0,
    iv_load_policy: 3,
    showinfo: 1,
    rel: 0
  },
  PLAYER_STATE : {
    "UNSTARTED": -1,
    "ENDED": 0,
    "PLAYING": 1,
    "PAUSED": 2,
    "BUFFERING": 3,
    "VIDEO CUED": 5
  }
});

/* ytApi: Service
 * ytAPi is a service which interacts directly with YouTube's API functions and
 * properties.
 */
player.factory('ytApi', ['ytConfig', function(ytConfig) {
  // the service object which will be returned
  var srv = {};

  /* injectApiScript:
   * A function which injects the YouTube api script into the document
   * YouTube API requires the API be injected this way.
   */
  (function injectYtApiScript() {
    if (!window.ytApiInjected) {
      var tag = document.createElement('script');
      tag.src = "http://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.ytApiInjected = true;
    }
  })();

  // OBSERVERS
  var stateObserverCbs = [];
  var readyObserverCbs = [];
  var apiReadyObserverCbs = [];

  srv.regStateObserverCb = function(cb) {
    stateObserverCbs.push(cb);
  };

  srv.regReadyObserverCb = function(cb) {
    readyObserverCbs.push(cb);
  };

  srv.regApiReadyObserverCb = function(cb) {
    apiReadyObserverCbs.push(cb);
  };

  srv.notifyStateObservers = function( e ) {
    angular.forEach(stateObserverCbs, function(cb) {
      cb( e );
    });
  };

  srv.notifyReadyObservers = function( e ) {
    angular.forEach(readyObserverCbs, function(cb) {
      cb( e );
    });
  };

  srv.notifyApiReadyObservers = function() {
    angular.forEach(apiReadyObserverCbs, function(cb) {
      cb();
    });
  };

  // For use with the YouTube API
  srv.onStateChange = function( e ) {
    srv.playerState = e.data;
    srv.notifyStateObservers( e );
  };

  // SERVICE PROPERTIES
  srv.playerBuffer = 0;
  srv.playerState = ytConfig.PLAYER_STATE.UNSTARTED;
  srv.playerTime_sec = 0;
  



  srv.play = function() {
    if (srv.player) {
      srv.player.playVideo();
    }
  };

  srv.pause = function() {
    if (srv.player) {
      srv.player.pauseVideo();
    }
  };

  srv.updatePlayerTime_sec = function() {
    if (srv.player) {
      srv.playerTime_sec = srv.player.getCurrentTime() || 0;
    } else {
      return 0;
    }
  };

  srv.updatePlayerState = function() {
    if (srv.player) {
      srv.playerState = srv.player.getPlayerState();
    } else {
      return ytConfig.PLAYER_STATE.UNSTARTED;
    }
  };

  srv.getPlayerState = function() {
    if (srv.player) {
      if (srv.player.getPlayerState) {
        return srv.player.getPlayerState();
      }
    }
  };

  srv.onReady = function( e ) {
    srv.notifyReadyObservers( e );
  };

  srv.initPlayer = function() {
    return new YT.Player(ytConfig.elId, {
      width: ytConfig.width,
      height: ytConfig.height,
      playerVars: ytConfig.playerVars,
      events: {
        'onReady': srv.onReady,
        'onStateChange': srv.onStateChange
      }
    });
  };

  srv.getBufferPct = function() {
    if (srv.player) {
      if (srv.player.getVideoLoadedFraction) {
        return (srv.player.getVideoLoadedFraction() * 100);
      }
    }
    return 0; // fallback for uninstantiated player / getVideoLoadedFraction
  };

  srv.getProgressSec = function() {
    if (srv.player) {
      if (srv.player.getCurrentTime) {
        return srv.player.getCurrentTime() || 0;
      }
    }
    return 0; // fallback for uninstantiated player / getCurrentTime
  };

  // Required by the YouTube API
  // set window.onYouTubeIframeAPIReady to player service.onYouTubeIframeAPIReady
  srv.onYouTubeIframeAPIReady = function() {
    srv.player = srv.initPlayer();
  };

  srv.cueVideoWithStartTime = function(video, startTime_sec) {
    srv.player.cueVideoById({
      videoId: video.id,
      startSeconds: startTime_sec
    });
    video.isCurrentVideo = true;
  };

  srv.loadVideoWithStartTime = function(video, startTime_sec) {
    srv.player.loadVideoById({
      videoId: video.id,
      startSeconds: startTime_sec
    });
    video.isCurrentVideo = true;
  };

  srv.cue = function(video) {
    srv.player.cueVideoById({
      videoId: video.id,
      startSeconds: 0.0 //stupid bug with YouTube, hoping it will fix it
    });
    video.isCurrentVideo = true;
  };

  srv.load = function(video) {
    srv.player.loadVideoById({
      videoId: video.id,
      startSeconds: 0.0 //stupid bug with YouTube, hoping it will fix it
    });
    video.isCurrentVideo = true;
  };

  srv.seekTo = function(sec) {
    srv.player.seekTo(sec);
  };

  return srv;
}]);

/*
 *
 */
var app = angular.module('qTube', ['player', 'ui.sortable']);

/*
 *
 */
app.config(['$interpolateProvider', 
  function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
}]);

/*
 *
 */
app.factory('objects', function() {
  var Video = function(id, author, title, thumb_url, desc, dur_s, dur_sf) {
    this.isCurrentVideo = false;
    this.id = id;
    this.author = author;
    this.title = title;
    this.thumb_url = thumb_url;
    this.desc = desc;
    this.dur_s = dur_s;
    this.dur_sf = dur_sf;
  };

  Video.prototype.toObj = function() {
    var property_obj = {
      'isCurrentVideo': this.isCurrentVideo,
      'id': this.id,
      'author': this.author,
      'title': this.title,
      'thumb_url': this.thumb_url,
      'desc': this.desc,
      'dur_s': this.dur_s,
      'dur_sf': this.dur_sf
    };

    var obj = {
      'class': 'Video',
      'data': property_obj
    };
    return obj;
  };

  Video.prototype.setIndex = function() {
    this.isCurrentVideo = true;
  };

  Video.prototype.setNonIndex = function() {
    this.isCurrentVideo = false;
  };

  Video.prototype.toJson = function() {
    return JSON.stringify(this.toObj());
  };

  Video.fromObject = function(obj) {
    return new Video(
        obj.data.id,
        obj.data.author,
        obj.data.title,
        obj.data.thumb_url,
        obj.data.desc,
        obj.data.dur_s,
        obj.data.dur_sf
    );
  };

  var Queue = function(videos, videos_dict, currentVideoIndex, playerTime_sec, playing) {
    this.videos = videos;
    this.videos_dict = videos_dict;
    this.currentVideoIndex = currentVideoIndex;
    this.playerTime_sec = playerTime_sec;
    this.playing = playing;
  };

  Queue.prototype.toObj = function() {
    var videos_array = [];
    for (var i = 0; i < this.videos.length; i++) {
      videos_array.push(this.videos[i].toObj());
    }
    
    var property_obj = {
      'videos': videos_array,
      'videos_dict': this.videos_dict,
      'currentVideoIndex': this.currentVideoIndex,
      'playerTime_sec': this.playerTime_sec,
      'playing': this.playing
    };

    var obj = {
      'class': 'Queue',
      'data': property_obj
    };
    return obj;
  };

  Queue.prototype.toJson = function() {
    return JSON.stringify(this.toObj());
  };

  Queue.fromObject = function(obj) {
    window.shit = obj;
    var videos = [];
    for (var i = 0; i < obj.data.videos.length; i++) {
      videos.push(Video.fromObject(obj.data.videos[i]));
    }
    return new Queue(
        videos,
        obj.data.videos_dict,
        obj.data.currentVideoIndex,
        obj.data.playerTime_sec,
        obj.data.playing
    );
  };

  return {
    Video: Video,
    Queue: Queue
  };
});

/*
 *
 */
// srv is the service which is being returned.  queue is now a property of srv because of a closure issue
app.factory('queueService', ['objects', 
  function(objects) {
    var srv = {};

    var indexObserverCbs = [];
    var videosObserverCbs = [];

    srv.queue = new objects.Queue([], {}, -1, 0, false);

    srv.loadQueue = function(queue) {
      srv.queue = queue;
    };

    srv.regIndexObserverCb = function(cb) {
      indexObserverCbs.push(cb);
    };

    srv.regVideosObserverCb = function(cb) {
      videosObserverCbs.push(cb);
    };

    var notifyIndexObservers = function() {
      angular.forEach(indexObserverCbs, function(cb) {
        cb();
      });
    };

    var notifyVideosObservers = function() {
      angular.forEach(videosObserverCbs, function(cb) {
        cb();
      });
    };

    var setIndex = function(new_val) {
      if (srv.queue.currentVideoIndex >= 0) {
        if (srv.queue.videos[srv.queue.currentVideoIndex] !== undefined) {
          srv.queue.videos[srv.queue.currentVideoIndex].setNonIndex();
        }
      }
      srv.queue.currentVideoIndex = new_val;
      
      if (new_val >= 0) {
        srv.queue.videos[srv.queue.currentVideoIndex].setIndex();
      }
      notifyIndexObservers();
    };

    srv.videosLength = function() {
      return srv.queue.videos.length;
    };

    srv.playing = function() {
      return srv.queue.playing;
    };

    srv.setPlaying = function(playing) {
      srv.queue.playing = playing;
    };

    srv.getCurrentVideo = function() {
      return srv.queue.videos[srv.queue.currentVideoIndex];
    };

    srv.getCurrentVideoDuration = function() {
      if (srv.getCurrentVideo() !== undefined) {
        return srv.getCurrentVideo().dur_s;
      }
    };

    srv.updateIndex = function() {
      console.log('updateIndex');
      for (var i = 0; i < srv.queue.videos.length; i++) {
        if (srv.queue.videos[i].isCurrentVideo) {
          setIndex(i);
        }
      }
    };

    srv.hasNext = function() {
      return srv.queue.videos.length > srv.queue.currentVideoIndex + 1;
    };

    srv.hasPrevious = function() {
      return (srv.queue.currentVideoIndex - 1) >= 0;
    };

    var indexInBounds = function(index) {
      return index >=0 && index < srv.queue.videos.length;
    };

    srv.get = function(index) {
      if (indexInBounds(index)) {
        return srv.queue.videos[index];
      } else {
        return undefined;
      }
    };

    srv.changeToIndex = function(index) {
      if (indexInBounds(index)) {
        setIndex(index);
        return srv.queue.videos[index];
      } else {
        return undefined;
      }
    };

    srv.next = function() {
      if (srv.hasNext()) {
        setIndex(srv.queue.currentVideoIndex + 1);
        return srv.queue.videos[srv.queue.currentVideoIndex];
      } else {
        return undefined;
      }
    };

    srv.previous = function() {
      if (srv.hasPrevious()) {
        setIndex(srv.queue.currentVideoIndex - 1);
        return srv.queue.videos[srv.queue.currentVideoIndex];
      } else {
        return undefined;
      }
    };

    srv.incrementVideoDict = function(video) {
      if (srv.queue.videos_dict[video.id] !== undefined) {
        srv.queue.videos_dict[video.id] += 1;
      } else {
        srv.queue.videos_dict[video.id] = 1;
      }
    };

    srv.decrementVideoDict = function(video) {
      if (srv.queue.videos_dict[video.id] !== undefined) {
        srv.queue.videos_dict[video.id] -= 1;
        if (srv.queue.videos_dict[video.id] === 0) {
          delete srv.queue.videos_dict[video.id];
        }
      }
    };

    srv.videoInVideos = function(video) {
      return video.id in srv.queue.videos_dict;
    };

    srv.addVideo = function(video) {
      srv.queue.videos.push( Object.create(video) );
      srv.incrementVideoDict(video);
      notifyVideosObservers();
    };

    srv.lastIndexOfVideo = function(video) {
      if (srv.videoInVideos(video)) {
        for (var i = srv.queue.videos.length - 1; i >= 0; i--) {
          if (srv.queue.videos[i].id === video.id) {
            return i;
          }
        }
      }
      return -1;
    };

    srv.removeVideo = function(video) {
      //var index = srv.queue.videos.indexOf(video);
      if (srv.videoInVideos(video)) {
        for (var i = srv.queue.videos.length - 1; i >= 0; i--) {
          if (srv.queue.videos[i].id === video.id) {
            srv.removeVideoByIndex(i);
            break;
          }
        }
      }
    };

    srv.removeVideoByIndex = function(index) {
      if (indexInBounds(index)) {

        var videoAtIndex = srv.get(index);

        var isCurrentVideo = (index === srv.queue.currentVideoIndex);
        if (isCurrentVideo) {
          if (!srv.hasNext()) {
            if (srv.hasPrevious()) {
              setIndex(srv.queue.currentVideoIndex - 1);
            } else {
              setIndex(-1);
            }
          }
        }
        
        srv.decrementVideoDict(videoAtIndex);
        srv.queue.videos.splice(index, 1);
        
        // the if statements above will already update the index if the index arg === currentVideoIndex
        // but, if a video is removed before the currentVideoIndex (ie, index !== currentVideoIndex), then we want the currentVideoIndex to reflect that.
        // For ex, if currentVideoIndex = 1, and the index arg = 0, the currentVideoIndex would then be 0.
        if (!isCurrentVideo) {
          srv.updateIndex();
        }
        notifyVideosObservers();
      }
    };

    srv.insertVideo = function(video, index) {
      srv.queue.videos.splice(index, 0, video);
      srv.incrementVideoDict(video);
      notifyVideosObservers();
      notifyIndexObservers();
    };

    srv.setPlayerTime_sec = function(time) {
      srv.queue.playerTime_sec = time;
    };

    srv.getPlayerTime_sec = function() {
      return srv.queue.playerTime_sec;
    };

    srv.getVideos = function() {
      return srv.queue.videos;
    };

    srv.getIndex = function() {
      return srv.queue.currentVideoIndex;
    };

    srv.toJson = function() {
      return srv.queue.toJson();
    };

    var notifyObservers = function() {
      notifyIndexObservers();
      notifyVideosObservers();
    };

    srv.loadFromJson = function(jsonText) {
      srv.queue = objects.Queue.fromObject(JSON.parse(jsonText));
      notifyObservers();
    };

    srv.loadFromObj = function(obj) {
      srv.queue = objects.Queue.fromObject(obj);
      notifyObservers();
    };

    return srv;
}]);

/*
 *
 */
app.value('searchConfig', {
  resultsPerSearchQuery: 10,
  suggestionsPerQuery: 5,
  baseQUrl: 'http://gdata.youtube.com/feeds/videos?alt=json'
});

/*
 *
 */
app.factory('common', [function() {
  srv = {};

  srv.throttle = function(fn, delay) {
    var timer, last;
    return function() {
      var now = + new Date(),
          ctx = this,
          args = arguments;
      if (last && now < last + delay) {
          clearTimeout(timer);
          timer = setTimeout( function() {
            last = now;
            fn.apply(ctx, args);
          }, delay - now + last);
      } else {
        last = now;
        fn.apply(ctx, args);
      }
    };
  };

  return srv;

}]);

/*
 *
 */
app.value('apiConfig', {
  baseUri: 'http://qtube.io/api/',
  queueUri: 'q/'
});

/*
 *
 */
app.factory('apiService', ['$http', 'apiConfig', 
  function($http, apiConfig){
    srv = {};

    var generatePostQueueDataUri = function() {
      return apiConfig.baseUri + apiConfig.queueUri;
    };

    var generateGetQueueDataUri = function(token) {
      return apiConfig.baseUri + apiConfig.queueUri + token + '/';
    };

    srv.getQueueDataObj = function(token) {
      return $http.get( generateGetQueueDataUri(token) )
          .then( function(res) {
            return res.data;
          });
    };

    srv.postQueueDataJson = function(data) {
      return $http.post( generatePostQueueDataUri(), data )
        .then( function(res) {
          return res.data;
        });
    };

    return srv;
}]);

/*
 *
 */
app.factory('formats', ['objects', function(objects) {
  var srv = {};
  
  srv.secondsToHMS = function(seconds) {
    seconds = Math.floor(seconds);
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    var modSeconds = seconds % 60;
    if (modSeconds < 10) {
      modSeconds = "0" + modSeconds;
    }

    return (hours + ":" + minutes + ":" + modSeconds);

  };

  srv.videosFromGdataEntry = function(entries) {
    var videos = [];

    for (var i in entries) {
      var entry = entries[i];
      
      // old obj's id is a url, with the last section holding the video ID
      var id = entry.id.$t.split('/').pop();

      var author = entry.author[0].name.$t;
      var title = entry.title.$t;
      var thumb_url = entry.media$group.media$thumbnail[0].url;
      var desc = entry.media$group.media$description.$t;

      var dur_s = entry.media$group.yt$duration.seconds;
      var dur_sf = srv.secondsToHMS( dur_s );

      var video = new objects.Video(id, author, title, thumb_url, desc, dur_s, dur_sf);

      videos.push(video);
    }

    return videos;
  };

  srv.gdataToSearchSuggestions = function(data) {
    return srv.videosFromGdataEntry(data.feed.entry);
  };

  srv.gdataToSuggestions = function(data) {
    var new_suggestions = [];
    for (var i in data.feed.entry) {
      new_suggestions.push(data.feed.entry[i].title.$t);
    }
    return new_suggestions;
  };

  srv.gdataToSearchResults = function(data) {
    window.blah = data;
    var newData = {}; //the object to be returned
    newData.startIndex = data.feed.openSearch$startIndex.$t;
    newData.totalResults = data.feed.openSearch$totalResults.$t;
    newData.itemsPerPage = data.feed.openSearch$itemsPerPage.$t;
    newData.range = newData.startIndex + newData.itemsPerPage;
    newData.results = srv.videosFromGdataEntry(data.feed.entry);
    return newData;
  };

  return srv;
}]);


/*
 *
 */
// active is to control for the case where the search input has been cleared (inactive)
// but a request is returned, which would then alter the suggestions to that request returned.
// we want there to be no search suggestions whatsoever if the input is cleared
app.factory('suggestionService', ['$http', 'searchConfig', 'formats', 'common', function($http, searchConfig, formats, common) {
  srv = {};

  var suggestions = [];
  var mostRecentSuggestionQuery = "";
  var active = true;

  var suggestionsObserverCbs = [];

  srv.regSuggestionsObserver = function( cb ) {
    suggestionsObserverCbs.push(cb);
  };

  notifySuggestionsObservers = function() {
    angular.forEach(suggestionsObserverCbs, function( cb ) {
      cb();
    });
  };

  srv.setSuggestions = function(query, arr) {
    if (active) {
      if ( arr.length === 0 || query === mostRecentSuggestionQuery) {
        suggestions = arr;
        notifySuggestionsObservers();
      }
    }
  };

  srv.getSuggestions = function() {
    return suggestions;
  };

  var generateQUri = function( q ) {
    return searchConfig.baseQUrl + '&start-index=1&max-results=' + searchConfig.suggestionsPerQuery + "&q=" + q;
  };

  srv.setInactive = function() {
    srv.setSuggestions('', []);
    mostRecentSuggestionQuery = "";
    active = false;
  };

  srv.setActive = function() {
    active = true;
  };

  var suggestionRequest = function( q ) {
    return $http.get( generateQUri( q ) )
      .then( function(res) {
        return formats.gdataToSuggestions(res.data);
      });
  };

  srv.suggest = function( q ) {
    mostRecentSuggestionQuery = q;
    suggestionRequest( q )
      .then( function(data) {
        srv.setSuggestions(q, data);
      });
  };

  return srv;
}]);

/*
 *
 */
// turn into angular.service
app.factory('searchService', ['$http', 'searchConfig', 'formats', function($http, searchConfig, formats) {
  srv = {};

  var searchIndex = 0;
  var searchTerm = "";
  var searchResults = [];

  var currentlySearching = false;

  var resultsObserverCbs = [];

  srv.regResultsObserverCb = function(cb) {
    resultsObserverCbs.push(cb);
  };

  var notifyResultsObservers = function() {
    angular.forEach(resultsObserverCbs, function(cb) {
      cb();
    });
  };

  var pushResults = function(data) {
    searchResults.push(data);
    notifyResultsObservers();
  };

  var generateQUri = function() {
    var start_index_qs = "&start-index=" + (searchIndex * searchConfig.resultsPerSearchQuery + 1);
    var max_results_qs = "&max-results=" + searchConfig.resultsPerSearchQuery;
    var search_qs = "&q=" + escape( searchTerm );
    return searchConfig.baseQUrl + start_index_qs + max_results_qs + search_qs;
  };

  var incrementSearchIndex = function() {
    searchIndex += 1;
  };

  var getSearchResults = function() {
    currentlySearching = true;
    return $http.get( generateQUri() )
        .then( function(res) {
          currentlySearching = false;
          incrementSearchIndex();
          return formats.gdataToSearchResults(res.data);
        });
  };

  srv.results = function() {
    return searchResults;
  };

  srv.search = function( q ) {
    searchTerm = q;
    searchIndex = 0;
    searchResults = [];

    getSearchResults()
      .then( function(data) {
        pushResults(data);
      });
  };

  srv.more = function() {
    if (!currentlySearching) {
    getSearchResults()
      .then( function(data) {
        pushResults(data);
      });
    }
  };

  return srv;
}]);

app.controller('AppController', [
  'apiService',
  'queueService', 
  'searchService',
  'suggestionService',
  'objects',
  'common',
  'formats', 
  'ytApi',
  'ytConfig',
  '$scope',
  '$location',
  '$interval', 
  function( apiService, queueService, searchService, suggestionService, objects, common, formats, ytApi, ytConfig, $scope, $location, $interval) {
  // For debug, remove in prod
  window._a = apiService;
  window._q = queueService;
  window._ss = suggestionService;
  window._s = searchService;
  window._y = ytApi;
  window._o = objects;
  window._$ = $scope;
  window._l = $location;
  var init_app = function() {
    var path_arr = $location.path().split('/').splice(1);
    if (path_arr[0] === 'q') {
      loadQueueFromToken(path_arr[1]);
    } else {
      //var first_vid = new objects.Video('Q-iL4P3tvK8', 'VHS Documentaries', 'PBS Nova Tales From the Hive (2000, 2007)', 'null', 'desc', 3232);
      //queueService.addVideo(first_vid);
    }
  };

  ytApi.regReadyObserverCb( init_app );

  $scope.PLAYER_STATE = ytConfig.PLAYER_STATE;

  $scope.videos = queueService.getVideos();
  $scope.currentVideoIndex = queueService.getIndex();
  $scope.currentVideo = {'dur_sf': '0:00:00'};

  $scope.playing = false;
  $scope.searchText = "";

  $scope.searchFocus = false;
  $scope.mouseOverProgressBar = false;

  $scope.playerState = ytApi.playerState;
  $scope.playerTime_sec = ytApi.playerTime_sec;
  $scope.playerTime_HMS = formats.secondsToHMS( ytApi.playerTime_sec );

  $scope.searchSuggestions = [];
  $scope.searchResults = [];

  $scope.playerProgressPct = 0;
  $scope.playerBufferPct = 0;

  var setQueuePath = function(token) {
    changePathTo('/q/' + token);
  };

  var changePathTo = function(path) {
    //$scope.$apply( 
      $location.path(path);
    //);
  };

  var appendToPath = function(path) {
    $scope.$apply( $location.path( $location.path() + path) );
  };

  var playerBufferPct = function() {
    return ytApi.getBufferPct();
  };

  // debug
  var playerProgressPct = function() {
    //var currentVideo = queueService.getCurrentVideo();
    if ($scope.currentVideo) {
      if (ytApi.getPlayerState() === $scope.PLAYER_STATE.ENDED) {
        return 100;
      } else {
        return ((ytApi.getProgressSec() / $scope.currentVideo.dur_s) * 100);
      }
    } else {
      return 0;
    }
  };

  var playerTime_HMS = function() {
    return formats.secondsToHMS( ytApi.getProgressSec() || 0 );
  };

  // is pct a float or digit ( x / 100 ) ?
  var playerPctToSec = function(pct) {
    //var currentVideo = queueService.getCurrentVideo();
    if ($scope.currentVideo) {
      return ( parseInt( (pct / 100) * $scope.currentVideo.dur_s ) );
    } else {
      return 0;
    }
  };

  var percentToHMS = function(pct) {
    return formats.secondsToHMS( playerPctToSec(pct) );
  };

  $scope.playerPctToHMS = function(pct) {
    return (formats.secondsToHMS( playerPctToSec(pct) ));
  };

  var updateProgressAndBufferPct = function() {
    $scope.playerProgressPct = playerProgressPct();

    if (!$scope.mouseOverProgressBar) {
      $scope.playerTime_HMS = playerTime_HMS();
    }

    $scope.playerBufferPct = playerBufferPct();
  };

  $interval( updateProgressAndBufferPct, 100 );

  window.onYouTubeIframeAPIReady = function() {
    ytApi.onYouTubeIframeAPIReady();
  };

  var updatePlayerStatusBarModels = function() {

  };

  var onPlayerReady = function() {
    if ($scope.playing) {
      ytApi.play();
    }
  };

  var updatePlayerState = function() {
    console.log('update player state');
    
    // if the user pauses the video via YouTube (and not our UI) we want to 
    // make sure to update $scope.playing to match that
    if (ytApi.playerState === $scope.PLAYER_STATE.PLAYING) {
      $scope.playing = true;
    }
    else if (ytApi.playerState === $scope.PLAYER_STATE.PAUSED) {
      $scope.playing = false;
    }

    else if (ytApi.playerState === $scope.PLAYER_STATE.ENDED) {
      console.log('ended');
      // stupid thing; only way to know if there is a transition is because it goes from paused -> ended.
      // but, a movie could end and then be left that way (if a person wanted it to be that way), so the only
      // way to check is to see if it was previously paused
      if (queueService.hasNext() && $scope.playerState === $scope.PLAYER_STATE.PAUSED) {
        $scope.playing = true;
        $scope.next();
      } else {
        $scope.playing = false;
      }

    }
    $scope.playerState = ytApi.playerState;
    $scope.$apply();
  };

  var updateVideos = function() {
    $scope.videos = queueService.getVideos();
  };

  var updateSearchResults = function() {
    $scope.searchResults = searchService.results();
  };

  var updateIndex = function() {
    $scope.currentVideoIndex = queueService.getIndex();
    $scope.currentVideo = queueService.getCurrentVideo();
  };

  var updateSearchSuggestions = function() {
    $scope.searchSuggestions = suggestionService.getSuggestions();
  };

  ytApi.regStateObserverCb(updatePlayerState);
  ytApi.regReadyObserverCb(onPlayerReady);

  queueService.regVideosObserverCb(updateVideos);
  queueService.regIndexObserverCb(updateIndex);

  searchService.regResultsObserverCb(updateSearchResults);

  suggestionService.regSuggestionsObserver(updateSearchSuggestions);

  var loadQueueFromToken = function(token) {
    apiService.getQueueDataObj(token)
        .then( function(obj) {
          queueService.loadFromObj(obj);
          syncWithQueue();
        });
  };

  var syncWithQueue = function() {
    if (queueService.getCurrentVideo() !== undefined) {
      if (queueService.playing()) {
        ytApi.loadVideoWithStartTime( queueService.getCurrentVideo(), 
          queueService.getPlayerTime_sec() );
      } else {
        ytApi.cueVideoWithStartTime( queueService.getCurrentVideo(), 
          queueService.getPlayerTime_sec() );
      }
    }
  };

  $scope.saveQueue = function() {
    ytApi.updatePlayerTime_sec();
    queueService.setPlayerTime_sec( ytApi.playerTime_sec );
    queueService.setPlaying( $scope.playing );
    apiService.postQueueDataJson( queueService.queue.toJson() )
        .then( function(token) {
          setQueuePath(token);
        });
  };

  $scope.loadOrCue = function(video) {
    if ($scope.playing) {
      ytApi.load(video);
    } else {
      ytApi.cue(video);
    }
  };

  // if we are removing the currently played video, then we need to 
  $scope.removeVideoInQueue = function(index, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    if (index === $scope.currentVideoIndex) {
      queueService.removeVideoByIndex(index);
      if (queueService.getIndex() === -1) {
        $scope.loadOrCue( "" );
      } else {
        $scope.loadOrCue( queueService.getCurrentVideo() );
      }
    } else {
      queueService.removeVideoByIndex(index);
    }

    if ($scope.videos.length === 0) {
      $scope.loadOrCue( "" );
    }
  };

  $scope.previous = function( e ) {
    var prev = queueService.previous();
    if (prev) {
      $scope.loadOrCue(prev);
    }
  };

  $scope.next = function( e ) {
    var next = queueService.next();
    if (next) {
      $scope.loadOrCue(next);
    }
  };

  $scope.play_pause = function( e ) {
    if ($scope.playing) {
      $scope.playing = false;
      ytApi.pause();
    } else {
      $scope.playing = true;
      if ($scope.currentVideoIndex === -1) {
        $scope.next();
      } else {
        ytApi.play();
      }
    }
  };

  $scope.videoInVideos = function(video) {
    return queueService.videoInVideos(video);
  };

  $scope.setIndexTo = function(index, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    if ($scope.playing) {
      $scope.loadVideoAtIndex(index);
    } else {
      $scope.cueVideoAtIndex(index);
    }
  };

  $scope.loadVideoAtIndex = function(index, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }
    ytApi.load( queueService.changeToIndex(index) );
  };

  $scope.cueVideoAtIndex = function(index) {
    ytApi.cue( queueService.changeToIndex(index) );
  };

  $scope.addVideo = function(video, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    queueService.addVideo(video);
  };

  $scope.addAndPlayVideo = function(video, $event) {
    $scope.addVideo(video, $event);
    $scope.loadVideoAtIndex( queueService.videosLength() - 1 );
  };

  $scope.displaySeekTime = function($event) {
    $scope.mouseOverProgressBar = true;
    if (queueService.getCurrentVideoDuration() !== undefined) {
      $scope.playerTime_HMS = formats.secondsToHMS( queueService.getCurrentVideoDuration() * ($event.offsetX / $event.currentTarget.scrollWidth));
    } else {
      $scope.playerTime_HMS = formats.secondsToHMS( 0 );
    }

  };

  $scope.seekToFromEvent = function($event) {
    ytApi.seekTo(queueService.getCurrentVideoDuration() * ($event.offsetX / $event.currentTarget.scrollWidth));
  };

  $scope.hideSeekTime = function() {
    $scope.playerTime_HMS = playerTime_HMS();
    $scope.mouseOverProgressBar = false;
  };

  $scope.removeVideo = function(video, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    $scope.removeVideoInQueue( queueService.lastIndexOfVideo(video) );
  };

  $scope.suggestSearch = function(suggestionText) {
    $scope.searchText = suggestionText;
    $scope.search();
  };

  $scope.search = function() {
    $scope.searchSuggestions = [];
    suggestionService.setInactive();

    searchService.search($scope.searchText);
  };

  var throttledGetSuggestions = common.throttle(function() {
    suggestionService.setActive();
    suggestionService.suggest($scope.searchText);
  }, 200);

  $scope.newSuggestions = function() {
    if ($scope.searchText !== "") {
      throttledGetSuggestions();
    } else {
      suggestionService.setInactive();
    }
  };

  $scope.loadDataWithToken = function(token) {
    
  };

  // Part of AngularUI's 'draggable' wrapper.  This call back will make it so
  // that after the list items are dragged around the index will update.
  $scope.sortOptions = {
    stop: function(e, ui) {
      queueService.updateIndex();
    }
  };


jQuery(document).ready( function() {
  // windowLoadStart is a number which will affect the dynamic loading.
  // Currently this var is set so that loadMoreSearchResults will be called
  // when the window is .3 window height above the bottom of the document.
  var windowLoadStart = screen.height * 0.0;

  // Simple jQuery function checks to see if the browser window is at the bottom
  // of the page.  If the browser window is at the bottom of the page, then
  // using the globalLoadMoreSearchResults function, will load more results.
  $(window).scroll(function(){ 
    // checks to see if the window is currently at the bottom of the content
    if ( ($(window).scrollTop() >= 
        ($(document).height() - screen.height + windowLoadStart)) &&
        $scope.searchResults.length > 0) { 
      searchService.more();
    }
  });
});


$scope.shouldShowSuggestions = function() {
  return ($scope.searchSuggestions.length > 0 && $scope.searchFocus);
};

// wayyyyy not worth the effort to do this the right way
$scope.stupidHack = function() {
  setTimeout( function() {
    $scope.searchFocus = false;
  }, 50);
};


}]);

app.directive('qtQueue', function() {
  return {
    restrict: 'E',
    replace: true,

    template: (
      '<div>\n' +
        '<div class="queue-title-wrap">' +
          '<h2 class="queue-title">Queue</h2>' +
          '<div title="Save" class="player-button save" ng-click="saveQueue()"></div>' +
        '</div>' +
        '<div ng-model="videos" id="queue" ui-sortable="sortOptions">\n' +
          '<div class="queue-item" ng-click="loadVideoAtIndex($index, $event)" ng-class="{\'current-video\': video.isCurrentVideo}" ng-repeat="video in videos track by $index">' +
            '<h3 title="{[ video.title ]}" class="queue-item-title">{[ video.title | trim:55 ]}</h3>' +
            '<div class="queue-button-wrap">' +
              '<div title="remove" class="queue-button remove" ng-click="removeVideoInQueue($index, $event)"></div>' +
              '<div title="play" class="queue-button play" ng-click="loadVideoAtIndex($index, $event)"></div>' +
              '<div title="make current video" class="queue-button set-index" ng-click="setIndexTo($index, $event)"></div>' +
            '</div>' +
          '</div>\n' +
        '</div>\n' +
      '</div>\n'
    )
  };
});

player.directive('qtPlayer', function() {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: '<div id="' + playerId + '"></div>'
  };
});

app.directive('qtPlayerProgressBar', function() {
  return {
    restrict: 'E',
    replace: true,
    template: (
      '<div>' +
      '<div id="player-progress-bar" ng-mousemove="displaySeekTime($event)" ng-mouseleave="hideSeekTime()" ng-click="seekToFromEvent($event)">\n' +
        '<div class="player-progress" style="width:{[playerProgressPct]}%"></div>' +
        '<div class="player-buffer" style="width:{[playerBufferPct]}%"></div>' +
      '</div>' +
      '<div class="player-time-wrap">' +
        '<div ng-class="mouseOverProgressBar ? \'progress-hover\' : \'\'" class="player-time current">{[ playerTime_HMS ]}</div>' +
        '<div class="player-time total">{[ currentVideo.dur_sf || "0:00:00" ]}</div>' +
      '</div>' +
      '</div>'
    )
  };
});

app.directive('qtPlayerButtons', function() {
  return {
    restrict: 'E',
    replace: true,
    template: (
      '<div class="player-button-wrap">\n' +
      '<div title="Previous" class="player-button previous" ng-click="previous()"></div>' +
      '<div ng-attr-title="{[ playing && \'Pause\' || \'Play\' ]}" class="player-button" ng-class="playing ? \'pause\' : \'play\'" ng-click="play_pause()"></div>' +
      '<div title="Next" class="player-button next" ng-click="next()"></div>' +
      '</div>\n'
    )
  };
});

app.directive('qtSearchBar', function() {
  return {
    restrict: 'E',
    replace: true,
    template: (
      '<div id="search-wrap">' +
      '<form ng-submit="search()">' +
      '<input ng-focus="searchFocus = true;" ng-blur="stupidHack()" type="text" class="search-bar" ng-change="newSuggestions()" ng-model="searchText" autofocus/>' +
      '<input type="submit" value="Search" class="search-bar-button" />' +
      '<ul ng-click="searchFocus = true;" ng-show="shouldShowSuggestions()" class="search-suggestions">' +
      '<li class="search-suggestion" ng-click="suggestSearch(suggestion)" ng-repeat="suggestion in searchSuggestions track by $index">{[ suggestion | trim:60 ]}</li>' +
      '</form></div>'
    )
  };
});

app.directive('qtSearchResults', function() {
  return {
    restrict: 'E',
    replace: true,
    template: (
      '<div class="search-results-wrap">' +
      '<div class="search-results" ng-repeat="search in searchResults track by $index">' +
      '<h3 class="search-results-index">{[ search.startIndex ]} to {[ search.range ]} of {[ search.totalResults ]}</h3>' +
      '<div class="video-teaser" ng-click="addVideo(video, $event)" style="background-image:url({[ video.thumb_url ]});" ng-repeat="video in search.results track by $index">' +
        '<h2 class="video-teaser-title">{[ video.title ]}</h2>' +
        '<div ng-click="undefined" class="teaser-button-wrap">' +
          '<div class="teaser-button remove" ng-show="videoInVideos(video)" ng-click="removeVideo(video, $event)"></div>' +
          '<div class="teaser-button add" ng-click="addVideo(video, $event)"></div>' +
          '<div class="teaser-button play" ng-click="addAndPlayVideo(video, $event)"></div>' +
        '</div>' +
      '</div>' +
      '</div></div>'
    )
  };
});

angular.module('ng').filter('trim', function() {
  return function(val, max) {
    if (!val) return '';
    max = parseInt(max);
    if (val.length >= max - 3) {
      return val.substring(0, ( max - 3 )) + '...';
    } else {
      return val;
    }
  };
});

/*
vid1 = new _o.Video('12345', 'auth', 'title1', 'thumb_url', 'description1', 120);
vid2 = new _o.Video('12346', 'auth', 'title2', 'thumb_url', 'description1', 120);
vid3 = new _o.Video('12346', 'auth', 'title3', 'thumb_url', 'description1', 120);
vid4 = new _o.Video('12346', 'auth', 'title4', 'thumb_url', 'description1', 120);
vid5 = new _o.Video('12346', 'auth', 'title5', 'thumb_url', 'description1', 120);
vid6 = new _o.Video('12346', 'auth', 'title6', 'thumb_url', 'description1', 120);
_q.addVideo(vid1);
_q.addVideo(vid2);
_q.addVideo(vid3);
_q.addVideo(vid4);
_q.addVideo(vid5);
_q.addVideo(vid6);
*/
