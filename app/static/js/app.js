/*//////////////////////////////////////////////////////////////////////////////
Created by Loren Howard, August 2014 - Build 1
qtube is a YouTube API wrapper written in AngularJS which allows users to easily
create and save playlists.  In Build 2 I hope to add websockets functionality
so that a user can use their mobile phone as a remote control.
/*//////////////////////////////////////////////////////////////////////////////

// module for the YouTube player
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

  srv.regStateObserverCb = function(cb) {
    stateObserverCbs.push(cb);
  };

  srv.regReadyObserverCb = function(cb) {
    readyObserverCbs.push(cb);
  };

  var notifyStateObservers = function( e ) {
    angular.forEach(stateObserverCbs, function(cb) {
      cb( e );
    });
  };

  var notifyReadyObservers = function( e ) {
    angular.forEach(readyObserverCbs, function(cb) {
      cb( e );
    });
  };

  // For use with the YouTube API
  srv.onStateChange = function( e ) {
    srv.playerState = e.data;
    notifyStateObservers( e );
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

  srv.getPlayerState = function() {
    if (srv.player) {
      if (srv.player.getPlayerState) {
        return srv.player.getPlayerState();
      }
    }
  };

  var onReady = function( e ) {
    notifyReadyObservers( e );
  };

  srv.initPlayer = function() {
    return new YT.Player(ytConfig.elId, {
      width: ytConfig.width,
      height: ytConfig.height,
      playerVars: ytConfig.playerVars,
      events: {
        'onReady': onReady,
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
  window.onYouTubeIframeAPIReady = function() {
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

/* app: Module
 * The angular application
 */
var app = angular.module('qTube', ['player', 'ui.sortable']);

/* apiConfig: Value
 * Holds the API URI
 */
app.value('apiConfig', {
  baseUri: 'http://127.0.0.1:5000/api/',
  queueUri: 'q/'
});

/* searchConfig: Value
 * Holds the search URIs, values, etc.
 */
app.value('searchConfig', {
  resultsPerSearchQuery: 10,
  suggestionsPerQuery: 5,
  baseQUrl: 'http://gdata.youtube.com/feeds/videos?alt=json'
});

/* Jinja2 uses the same bindings as vanilla AngularJS ( {{ and }} )
 * This sets the AngularJS bindings to {[ and ]} to avoid conflict
 */
app.config(['$interpolateProvider', 
  function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
}]);

/* Here we add a filter for the templates so that we can trim / truncate
 * strings.  When called, it will trim the string and append ellipses.
 */
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

/* objects: Service
 * Holds the application wide objects that we will be using, namely Video 
 * and Queue.  Might be better to have this as a value instead of a service,
 * but it works just fine.
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

  Video.prototype.setCurrentVideo = function() {
    this.isCurrentVideo = true;
  };

  Video.prototype.setNotCurrentVideo = function() {
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
    // videos_dict is in reality a JS object / associative array.  I named it
    // a dictionary because calling it 'videos_obj' isn't very descriptive
    // videos_dict will have video.ids as the key, and a count as the value.
    // ie, {'<some_video_id>':2} means 2 videos are in the queue with that id
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

  // to be used from parsed Json objects after loading
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

/* queueService: Service
 * This service holds a queue object, which can be manipulated via setters and
 * getters.  Is utilized by the controller.
 */
app.factory('queueService', ['objects', 
  function(objects) {
    // srv == the service which is being returned in this function.
    // all srv.XXXXX properties are accessible by the controller
    var srv = {};

    var indexObserverCbs = [];
    var videosObserverCbs = [];

    // was having a closure issue (I believe) so I made the queue a property of
    // srv, which is not ideal.  Will investigate.
    srv.queue = new objects.Queue([], {}, -1, 0, false);

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

    // sets the 'index' / currentVideo for the queue
    var setIndex = function(new_val) {
      if (srv.queue.currentVideoIndex >= 0) {
        if (srv.queue.videos[srv.queue.currentVideoIndex] !== undefined) {
          srv.queue.videos[srv.queue.currentVideoIndex].setNotCurrentVideo();
        }
      }
      srv.queue.currentVideoIndex = new_val;
      
      if (new_val >= 0) {
        srv.queue.videos[srv.queue.currentVideoIndex].setCurrentVideo();
      }
      notifyIndexObservers();
    };

    // returns the length of the queue
    srv.videosLength = function() {
      return srv.queue.videos.length;
    };

    // playing is only really accessed on saves / loads
    srv.playing = function() {
      return srv.queue.playing;
    };

    // setPlaying is only really accessed on saves/loads
    srv.setPlaying = function(playing) {
      srv.queue.playing = playing;
    };

    // returns the current video
    srv.getCurrentVideo = function() {
      return srv.queue.videos[srv.queue.currentVideoIndex];
    };

    // returns the current video's duration in seconds
    srv.getCurrentVideoDuration = function() {
      if (srv.getCurrentVideo() !== undefined) {
        return srv.getCurrentVideo().dur_s;
      }
    };

    // updateIndex is needed for the sortable UI interface.  When the queue
    // items are dragged around by the user, the indexes of the videos needs
    // to be updated
    srv.updateIndex = function() {
      for (var i = 0; i < srv.queue.videos.length; i++) {
        if (srv.queue.videos[i].isCurrentVideo) {
          setIndex(i);
        }
      }
    };

    // returns true if there is a video after the current video
    srv.hasNext = function() {
      return srv.queue.videos.length > srv.queue.currentVideoIndex + 1;
    };

    // returns true if there is a video before the current video
    srv.hasPrevious = function() {
      return (srv.queue.currentVideoIndex - 1) >= 0;
    };

    var indexInBounds = function(index) {
      return index >=0 && index < srv.queue.videos.length;
    };

    var getVideoAtIndex = function(index) {
      if (indexInBounds(index)) {
        return srv.queue.videos[index];
      } else {
        return undefined;
      }
    };

    // makes the video at an index the current video, and returns the video
    srv.changeToIndex = function(index) {
      if (indexInBounds(index)) {
        setIndex(index);
        return srv.queue.videos[index];
      } else {
        return undefined;
      }
    };

    // sets the queue index to the next video and returns that video
    srv.next = function() {
      if (srv.hasNext()) {
        setIndex(srv.queue.currentVideoIndex + 1);
        return srv.queue.videos[srv.queue.currentVideoIndex];
      } else {
        return undefined;
      }
    };

    // sets the queue index to the previous video and returns that video
    srv.previous = function() {
      if (srv.hasPrevious()) {
        setIndex(srv.queue.currentVideoIndex - 1);
        return srv.queue.videos[srv.queue.currentVideoIndex];
      } else {
        return undefined;
      }
    };

    var incrementVideoDict = function(video) {
      if (srv.queue.videos_dict[video.id] !== undefined) {
        srv.queue.videos_dict[video.id] += 1;
      } else {
        srv.queue.videos_dict[video.id] = 1;
      }
    };

    var decrementVideoDict = function(video) {
      if (srv.queue.videos_dict[video.id] !== undefined) {
        srv.queue.videos_dict[video.id] -= 1;
        if (srv.queue.videos_dict[video.id] === 0) {
          delete srv.queue.videos_dict[video.id];
        }
      }
    };

    // returns true if the video is in the queue (by checking the videos_dict)
    srv.videoInVideos = function(video) {
      return video.id in srv.queue.videos_dict;
    };

    // adds a video to the queue
    // We use Object.create to make sure that each video is it's own
    // instantiated obj.  Otherwise, if we play or delete one of many duplicate
    // videos, then the other duplicate videos will have their properties change
    srv.addVideo = function(video) {
      srv.queue.videos.push( Object.create(video) );
      incrementVideoDict(video);
      notifyVideosObservers();
    };

    // returns the last index of a video in the queue
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

    // removes a video at an index from the queue
    srv.removeVideoByIndex = function(index) {
      if (indexInBounds(index)) {

        var videoAtIndex = getVideoAtIndex(index);

        var isCurrentVideo = (index === srv.queue.currentVideoIndex);
        if (isCurrentVideo) {
          // if there is a next video, the index will not change
          if (!srv.hasNext()) {
            if (srv.hasPrevious()) {
              // if there is no next video, but there is a previous video, index
              // will change to current - 1
              setIndex(srv.queue.currentVideoIndex - 1);
            } else {
              // if there isn't a next or a previous video, then set index to -1
              setIndex(-1);
            }
          }
        }
        
        decrementVideoDict(videoAtIndex);

        // remove the video from the queue
        srv.queue.videos.splice(index, 1);
        
        // the if statements above will already update the index if the 
        // index arg === currentVideoIndex but, if a video is removed before the
        // currentVideoIndex (ie, index !== currentVideoIndex), then we want the
        // currentVideoIndex to reflect that. For ex, if currentVideoIndex = 1, 
        // and the index arg = 0, the new currentVideoIndex would then be 0.
        if (!isCurrentVideo) {
          srv.updateIndex();
        }

        // notify the videos observers because we have just altered videos,
        // note, srv.updateIndex above will already call notifyIndexObservers
        notifyVideosObservers();
      }
    };

    // only used for saving / loading
    srv.setPlayerTime_sec = function(time) {
      srv.queue.playerTime_sec = time;
    };

    // only used for saving / loading
    srv.getPlayerTime_sec = function() {
      return srv.queue.playerTime_sec;
    };

    // returns the videos array of the queue
    srv.getVideos = function() {
      return srv.queue.videos;
    };

    // returns the index of the current video
    srv.getCurrentVideoIndex = function() {
      return srv.queue.currentVideoIndex;
    };

    // uses objects.Queue's toJson function to turn the queue into JSON format
    srv.toJson = function() {
      return srv.queue.toJson();
    };

    // notifies index and videos observers
    var notifyObservers = function() {
      notifyIndexObservers();
      notifyVideosObservers();
    };

    // uses objects.Queue's fromObject function to create a Queue from parsed JSON
    srv.loadFromObj = function(obj) {
      srv.queue = objects.Queue.fromObject(obj);
      notifyObservers();
    };

    return srv;
}]);

/* common: Service
 * Will hold common reused app-wide functions, like throttle
 */
app.factory('common', [function() {
  srv = {};

  // throttle makes it so a function can only be called at most once every time
  // delay.  For ex, if delay is 200ms, the function can only be called once
  // every 200ms.  After the 200ms is up, the most recent function call will
  // execute.
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

/* apiService: Service
 * Handles interacting with the backend API.
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

/* formats: Service
 * Holds various formatting functions, like 'secondsToHMS' (seconds to Hours, 
 * minutes, seconds), GDATA formatting, etc.
 */
app.factory('formats', ['objects', function(objects) {
  var srv = {};
  
  // converts a seconds int to 'H:MM:SS' (hours:minutes:seconds) string format
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

  // converts data from GData to video objects array
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

  // converts gdata to search suggestions format
  srv.gdataToSuggestions = function(data) {
    var new_suggestions = [];
    for (var i in data.feed.entry) {
      new_suggestions.push(data.feed.entry[i].title.$t);
    }
    return new_suggestions;
  };

  //converts gdata to search results format
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


/* suggestionService: Service
 * for making user input suggestions
 */
app.factory('suggestionService', ['$http', 'searchConfig', 'formats', 
  function($http, searchConfig, formats) {   
    srv = {};

    var suggestions = [];
    var mostRecentSuggestionQuery = "";

    // active is to control for the case where the search input has been cleared 
    // (inactive) but a request is returned, which would then alter the  
    // suggestions to that request returned. We want there to be no search  
    // suggestions whatsoever if the input is cleared
    var active = true;

    var suggestionsObserverCbs = [];

    srv.regSuggestionsObserver = function( cb ) {
      suggestionsObserverCbs.push(cb);
    };

    var notifySuggestionsObservers = function() {
      angular.forEach(suggestionsObserverCbs, function( cb ) {
        cb();
      });
    };

    // sets the suggestions to the array
    var setSuggestions = function(query, arr) {
      if (active) {
        // to ensure that we are setting the suggestions of only the most recent
        // suggestion query, we check if the query === mostRecentSuggestionQuery
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

    // setInactive is to clear the suggestions when the user input is cleared
    srv.setInactive = function() {
      setSuggestions('', []);
      mostRecentSuggestionQuery = "";
      active = false;
    };

    // sets active so that suggestions can be set
    srv.setActive = function() {
      active = true;
    };

    var suggestionRequest = function( q ) {
      return $http.get( generateQUri( q ) )
        .then( function(res) {
          return formats.gdataToSuggestions(res.data);
        });
    };

    // sends a request for suggestions for query q, sets the suggestions on res
    srv.suggest = function( q ) {
      mostRecentSuggestionQuery = q;
      suggestionRequest( q )
        .then( function(data) {
          setSuggestions(q, data);
        });
    };

    return srv;
}]);

/* searchService: service
 * for getting search results from Gdata
 */
app.factory('searchService', ['$http', 'searchConfig', 'formats', 
  function($http, searchConfig, formats) {
    srv = {};

    var searchIndex = 0;
    var searchTerm = "";
    var searchResults = [];

    // to ensure that there's only one search at a time
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

    // used so that results observers are notified
    var pushResults = function(data) {
      searchResults.push(data);
      notifyResultsObservers();
    };

    var generateQUri = function() {
      var start_index_qs = "&start-index=" + 
          (searchIndex * searchConfig.resultsPerSearchQuery + 1);
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

    // gets more search results using the same query
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

app.factory('websocket', [function() {
  srv = {};
  var playPause, next, prev;

  srv.setPlayPause = function(fn) {
    playPause = fn;
  }

  srv.setNext = function(fn) {
    next = fn;
  }

  srv.setPrev = function(fn) {
    prev = fn;
  }

  var uri_split = location.origin.split(':');
  uri_split[0] = "ws";
  var uri = uri_split.join(':') + '/vsock';
  var ws = new WebSocket(uri)
  
  srv.registerId = function(id) {
    console.log('register')
    ws.send('{"register":"' + id + '"}');
  };

  ws.onmessage = function(m) {
    console.log('onmessage');
    console.log(m);
    var msg = JSON.parse(m.data);
    console.log(msg);
    if (msg.emit) {
      if (msg.emit == 'play_pause') {
        playPause();
      } else if (msg.emit == 'next') {
        next();
      } else if (msg.emit == 'prev') {
        prev();
      }
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
  'websocket',
  '$scope',
  '$location',
  '$interval', 
  function( apiService, queueService, searchService, suggestionService, objects, common, formats, ytApi, ytConfig, websocket, $scope, $location, $interval) {

  _$ = $scope;
  _w = websocket;

  var init_app = function() {
    var path_arr = $location.path().split('/').splice(1);
    if (path_arr[0] === 'q') {
      loadQueueFromToken(path_arr[1]);
    }
  };

  ytApi.regReadyObserverCb( init_app );

  $scope.videos = queueService.getVideos();
  $scope.currentVideoIndex = queueService.getCurrentVideoIndex();
  $scope.currentVideo = {'dur_sf': '0:00:00'};

  $scope.playing = false;
  $scope.searchText = "";

  $scope.searchFocus = false;

  $scope.mouseOverSuggestions = false;
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
    $location.path(path);
  };

  var getPlayerBufferPct = function() {
    return ytApi.getBufferPct();
  };

  // converts video progress in sec to percent, to be used on progress bar
  var playerProgressPct = function() {
    if ($scope.currentVideo) {
      if (ytApi.getPlayerState() === ytConfig.PLAYER_STATE.ENDED) {
        return 100;
      } else {
        return ((ytApi.getProgressSec() / $scope.currentVideo.dur_s) * 100);
      }
    } else {
      return 0;
    }
  };

  // converts the progress in sec to HMS format (H:MM:SS)
  var playerTime_HMS = function() {
    return formats.secondsToHMS( ytApi.getProgressSec() || 0 );
  };

  // converts percent of video duration to seconds.
  // To be used with ytApi's seekTo function
  var playerPctToSec = function(pct) {
    //var currentVideo = queueService.getCurrentVideo();
    if ($scope.currentVideo) {
      return ( parseInt( (pct / 100) * $scope.currentVideo.dur_s ) );
    } else {
      return 0;
    }
  };

  // converts percent of video duration to HMS format.  For displaying
  // the progress bar mouseover time
  var percentToHMS = function(pct) {
    return formats.secondsToHMS( playerPctToSec(pct) );
  };

  // gets the most current values for player progress and buffer
  // used for the progress bar
  var updateProgressAndBufferPct = function() {
    $scope.playerProgressPct = playerProgressPct();

    if (!$scope.mouseOverProgressBar) {
      $scope.playerTime_HMS = playerTime_HMS();
    }

    $scope.playerBufferPct = getPlayerBufferPct();
  };

  // interval to update the values for progress and buffer bars
  $interval( updateProgressAndBufferPct, 100 );

  // for ytApi.  After player is loaded it will call this
  var onPlayerReady = function() {
    if ($scope.playing) {
      ytApi.play();
    }
  };

  // gets the most recent values for the player state
  var updatePlayerState = function() {
    // if the user pauses the video via YouTube (and not our UI) we want to 
    // make sure to update $scope.playing to match that
    if (ytApi.playerState === ytConfig.PLAYER_STATE.PLAYING) {
      $scope.playing = true;
    }
    else if (ytApi.playerState === ytConfig.PLAYER_STATE.PAUSED) {
      $scope.playing = false;
    }

    else if (ytApi.playerState === ytConfig.PLAYER_STATE.ENDED) {
      // stupid thing; only way to know if there is a transition is because it 
      // goes from paused -> ended. but, a video could end and then be left
      // that way (if a person wanted it to be that way), so the only way to
      // check is to see if it was previously paused
      if (queueService.hasNext() && $scope.playerState === ytConfig.PLAYER_STATE.PAUSED) {
        $scope.playing = true;
        $scope.next();
      } else {
        $scope.playing = false;
      }

    }
    $scope.playerState = ytApi.playerState;
    $scope.$apply();
  };

  // gets most recent value for videos
  var updateVideos = function() {
    $scope.videos = queueService.getVideos();
  };

  // gets most recent value for search results
  var updateSearchResults = function() {
    $scope.searchResults = searchService.results();
  };

  // gets most recent value for currentVideo and currentVideoIndex
  var updateCurrentVideoIndex = function() {
    $scope.currentVideoIndex = queueService.getCurrentVideoIndex();
    $scope.currentVideo = queueService.getCurrentVideo();
  };

  // gets most recent value for search suggestions
  var updateSearchSuggestions = function() {
    $scope.searchSuggestions = suggestionService.getSuggestions();
  };

  // OBSERVERS
  // registers observers with the various services to ensure that the controller
  // has the most up to date values
  ytApi.regStateObserverCb(updatePlayerState);
  ytApi.regReadyObserverCb(onPlayerReady);

  queueService.regVideosObserverCb(updateVideos);
  queueService.regIndexObserverCb(updateCurrentVideoIndex);

  searchService.regResultsObserverCb(updateSearchResults);

  suggestionService.regSuggestionsObserver(updateSearchSuggestions);

  // loads a queue given a token.  Is used when loading the app
  var loadQueueFromToken = function(token) {
    apiService.getQueueDataObj(token)
        .then( function(obj) {
          queueService.loadFromObj(obj);
          syncWithQueue();
          websocket.registerId(token);
        });
  };

  // once a queue is loaded from Json / data, we need to sync the queue with
  // the player.  Ie, if the app should be playing a certain video, we need
  // to play that video.
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

  // saves the queue data
  $scope.saveQueue = function() {
    // set values so that they are most up to date
    ytApi.updatePlayerTime_sec();
    queueService.setPlayerTime_sec( ytApi.playerTime_sec );
    queueService.setPlaying( $scope.playing );

    // use the apiService to post data
    apiService.postQueueDataJson( queueService.toJson() )
        .then( function(token) {
          // once save is complete, update the path to include the data's token
          setQueuePath(token);
          websocket.registerId(token);
        });
  };

  // from ytApi: load = load video and play, cue = load video and pause
  var loadOrCue = function(video) {
    if ($scope.playing) {
      ytApi.load(video);
    } else {
      ytApi.cue(video);
    }
  };

  // removes a video from the queue by index
  $scope.removeVideoInQueue = function(index, $event) {
    // AngularJS will propagate events too far, so we need to stop them
    // from bubbling or propagating
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    // if we are removing the current video
    if (index === $scope.currentVideoIndex) {
      queueService.removeVideoByIndex(index);
      if (queueService.getCurrentVideoIndex() === -1) {
        loadOrCue( "" ); // queue is now empty
      } else {
        loadOrCue( queueService.getCurrentVideo() );
      }
    } else {
      queueService.removeVideoByIndex(index);
    }

    // if the queue is now empty, load "" so that the player will clear
    if ($scope.videos.length === 0) {
      loadOrCue( "" );
    }
  };

  // for the player controls; plays previous video
  $scope.previous = function( e ) {
    var prev = queueService.previous();
    if (prev) {
      loadOrCue( prev );
    }
  };

  // for the player controls; plays next video
  $scope.next = function( e ) {
    var next = queueService.next();
    if (next) {
      loadOrCue( next );
    }
  };

  // for the player controls; plays if paused, pauses if playing
  $scope.play_pause = function( e ) {
    if (queueService.videosLength() > 0) {
      if ($scope.playing) {
        $scope.playing = false;
        ytApi.pause();
      } else {
        $scope.playing = true;
      // if the queue is unstarted, play next
        if ($scope.currentVideoIndex === -1) {
          $scope.next();
        } else {
          ytApi.play();
        }
      }
    }
  };

  websocket.setPlayPause($scope.play_pause);
  websocket.setNext($scope.next);
  websocket.setPrev($scope.previous);

  // returns true if the video is in the queue
  $scope.videoInVideos = function(video) {
    return queueService.videoInVideos(video);
  };

  // basically loadOrCue but with an index
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

  // loads the video at the index / makes that video the current video
  $scope.loadVideoAtIndex = function(index, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }
    ytApi.load( queueService.changeToIndex(index) );
  };

  // cues the video at the index / makes that video the current video
  $scope.cueVideoAtIndex = function(index) {
    ytApi.cue( queueService.changeToIndex(index) );
  };

  // adds the video to the queue
  $scope.addVideo = function(video, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    queueService.addVideo(video);
  };

  // adds the video to the queue and plays the last video in the queue, which
  // should be the video we just added
  $scope.addAndPlayVideo = function(video, $event) {
    $scope.addVideo(video, $event);
    // the video has been added to the end, so to play we load it from the end
    $scope.loadVideoAtIndex( queueService.videosLength() - 1 );
  };

  // knowing the X offset of the mouse cursor over the progress bar, we can
  // convert that to the progress time in seconds.  This seek time will take
  // the place of the normal player time
  $scope.displaySeekTime = function($event) {
    $scope.mouseOverProgressBar = true;
    if (queueService.getCurrentVideoDuration() !== undefined) {
      $scope.playerTime_HMS = formats.secondsToHMS( queueService.getCurrentVideoDuration() * ($event.offsetX / $event.currentTarget.scrollWidth));
    } else {
      $scope.playerTime_HMS = formats.secondsToHMS( 0 );
    }
  };

  // displays the normal player time
  $scope.hideSeekTime = function() {
    $scope.playerTime_HMS = playerTime_HMS();
    $scope.mouseOverProgressBar = false;
  };

  // converts event x coordinate to percentage to a time in seconds and uses
  // the ytApi to seek to that time
  $scope.seekToFromEvent = function($event) {
    ytApi.seekTo(queueService.getCurrentVideoDuration() * ($event.offsetX / $event.currentTarget.scrollWidth));
  };

  // removes the video from the queue
  $scope.removeVideo = function(video, $event) {
    if ($event) {
      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    }

    $scope.removeVideoInQueue( queueService.lastIndexOfVideo(video) );
  };

  // conducts a suggestion search (ie, user clicks on a suggestion)
  $scope.suggestSearch = function(suggestionText) {
    $scope.searchText = suggestionText;
    $scope.search();
  };

  // conducts a search
  $scope.search = function() {
    $scope.searchSuggestions = [];
    suggestionService.setInactive();

    searchService.search($scope.searchText);
  };

  // will limit the get requests to once every 200ms.
  // the most recent user input will send the request (doesnt block most recent input)
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

  // Show the suggestions if there are suggestions, and if the mouse is over the
  // suggestions box or the search box has focus
  $scope.shouldShowSuggestions = function() {
    return ($scope.searchSuggestions.length > 0 && 
      ($scope.searchFocus || $scope.mouseOverSuggestions ));
  };

  // Part of AngularUI's 'draggable' wrapper.  This call back will make it so
  // that after the list items are dragged around the index will update.
  $scope.sortOptions = {
    stop: function(e, ui) {
      queueService.updateIndex();
    }
  };

  jQuery(document).ready( function() {
    // windowLoadStart is a constant which will affect the dynamic loading.
    var windowLoadStart = screen.height * 0.0;

    // Simple jQuery function checks to see if the browser window is at the bottom
    // of the page.  If the browser window is at the bottom of the page, then
    // it will load more search results.
    $(window).scroll(function(){ 
      // checks to see if the window is currently at the bottom of the content
      if ( ($(window).scrollTop() >= 
          ($(document).height() - screen.height + windowLoadStart)) &&
          $scope.searchResults.length > 0) { 
        searchService.more();
      }
    });
  });
}]);

// DIRECTIVES
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
              '<div title="Remove" class="queue-button remove" ng-click="removeVideoInQueue($index, $event)"></div>' +
              '<div title="Play" class="queue-button play" ng-click="loadVideoAtIndex($index, $event)"></div>' +
              '<div title="Jump To Video" class="queue-button set-index" ng-click="setIndexTo($index, $event)"></div>' +
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
    template: '<div id="' + playerId + '"></div>'
  };
});
// found a bug; sometimes the gdata info has the incorrect time amount.  simple solution is to mod 101 to make sure width never exceeds 100%.  Need a better solution, maybe if the pct is greater than 100 then get new gdata.
app.directive('qtPlayerProgressBar', function() {
  return {
    restrict: 'E',
    replace: true,
    template: (
      '<div>' +
      '<div id="player-progress-bar" ng-mousemove="displaySeekTime($event)" ng-mouseleave="hideSeekTime()" ng-click="seekToFromEvent($event)">\n' +
        '<div class="player-progress" style="width:{[playerProgressPct % 101]}%"></div>' +
        '<div class="player-buffer" style="width:{[playerBufferPct % 101]}%"></div>' +
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
      '<input ng-focus="searchFocus = true;" type="text" class="search-bar" ng-change="newSuggestions()" ng-model="searchText" autofocus/>' +
      '<input type="submit" value="Search" class="search-bar-button" />' +
      '<ul ng-mouseover="mouseOverSuggestions = true" ng-mouseleave="mouseOverSuggestions = false" ng-show="shouldShowSuggestions()" class="search-suggestions">' +
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
