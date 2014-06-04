/**
 * Angular Application 'QueueTube'
 * 
 * app.js - 
 * Holds the Angular functions, controllers, factories, and scripts
 *
 * Work in Progress, first created late Dec 2013
 * Created by Loren Howard, lorenhoward.com
 */

var app = angular.module('queueTube', []);


app.config( function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[');
  $interpolateProvider.endSymbol(']}');
});

function formatSeconds(seconds) {
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
}

function Video(id, author, title, thumbnailUrl, description, durationSeconds) {
  this.id = id;
  this.author = author;
  this.title = title;
  this.thumbnailUrl = thumbnailUrl;
  this.description = description;
  this.durationSeconds = durationSeconds;
}

/**
 * filterGoogleData takes Google's search results and puts some of the data into
 * a new object.  This new object is used in the template instead of Google's 
 * returned JSON object.
 */
function filterGoogleData(data) {
  var newData = {}; //the object to be returned
  newData.startIndex = data.feed.openSearch$startIndex.$t;
  newData.totalResults = data.feed.openSearch$totalResults.$t;
  newData.itemsPerPage = data.feed.openSearch$itemsPerPage.$t;
  newData.results = [];

  // These are the 'video objects' which are used later
  for (var i in data.feed.entry) {
    var entry = data.feed.entry[i];
    
    // old obj's id is a url, with the last section holding the video ID
    var id = entry.id.$t.split('/').pop();

    var author = entry.author[0].name.$t;
    var title = entry.title.$t;
    var thumbnailUrl = entry.media$group.media$thumbnail[0].url;
    var description = entry.media$group.media$description.$t;

    var durationSeconds = formatSeconds(
        entry.media$group.yt$duration.seconds);

    var video = new Video(id, author, title, thumbnailUrl, description, durationSeconds);

    newData.results.push(video);
  }

  return newData;
}

function googleDataToTitleList(data) {
  var newList = [];
  for(var i in data.feed.entry) {
    newList.push(data.feed.entry[i].title.$t);
  }
  return newList;
}

/**
 * getSearchResults takes a shortened query string as its parameter, which would
 * include the start index, the results per page, and the escaped search string.
 * An example argument would be '1&max-results=10&q=Cats'.  When this string is 
 * appended to the end of the GET request, it would return the search results of
 * index 1 through 10 for the search 'Cats'.
 * Uses promises with the then function.
 */
app.factory('searchService', function($http) {
  return {
    getSearchResults: function( q ) {
      var queryString = "http://gdata.youtube.com" + 
        "/feeds/videos?alt=json&start-index=" + q;
      return $http.get(queryString)
        .then( function(response) {
          // then is a promise.  If the promise is fulfilled then
          // call the callback and return the data
          return filterGoogleData(response.data);
        });
    },

    getSearchSuggestions: function( q ) {
      var queryString = "http://gdata.youtube.com" + 
        "/feeds/videos?alt=json&start-index=1&max-results=5&q=" + q;
      return $http.get(queryString)
        .then( function(response) {
          return googleDataToTitleList( response.data );
        });
    }
  };
});

// When using angular.element( ... ).scope(), the $apply method is sluggish and
// slower than using a global function which points to the actual method to use,
// so I use globalLoadMoreSearchResults which is later set to hold the 
// loadMoreSearchResults function.  This way it is much faster.
var globalLoadMoreSearchResults;

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

angular.module('ng').filter('less_than_index', function() {
  return function(val, this_index, vid_index) {
    if (this_index < vid_index) {
      return val;
    } else {
      return '';
    }
  };
});

angular.module('ng').filter('grtr_than_index', function() {
  return function(val, this_index, vid_index) {
    if (this_index > vid_index) {
      return val;
    } else {
      return '';
    }
  };
});

angular.module('ng').filter('is_index', function() {
  return function(val, this_index, vid_index) {
    if (this_index == vid_index) {
      return val;
    } else {
      return '';
    }
  };
});

// Angular controller, uses the searchService for asynchronous search
app.controller('PlayerController', function( searchService, $scope, $interval ) {
  $scope.videoQueue = []; //Queue - holds the queue of videos
  $scope.videoIndex = -1;
  
  // $scope.searchResults holds a list of search results. 
  // ex: [ [search results 1-10], [search results 11-20], ... etc ]
  $scope.searchResults = []; 
  $scope.searchSuggestions = [];

  var resultsPerQuery = 10;
  var storedSearchString;
  var currentlySearching = false;

  // This is to check the checkboxes in the search; If the video object is in
  // the videoQueue then the search box will be 'checked' need to revise by
  // using video objects that have a key as the id and the value as an object
  // with the video information, this would solve the issue of clearing a search
  // and making the same search, the check boxes are no longer checked!
  $scope.toggleSelection = function(video) {
    var index = $scope.videoQueue.indexOf(video);

    if (index > -1) {
      // if the video is already there remove it from the queue                       
      $scope.videoQueue.splice(index, 1);
    } else {
      // else the video is not there so add it to the queue
      $scope.videoQueue.push(video);
    }
  };

  $scope.useSuggestion = function(str) {
    $scope.searchString = str;
    $scope.newSearch();
    $scope.searchSuggestions = [];
  };

  suggestions_array = [];

  var throttled_set_search_suggestions = function(data) {
    
  };

  // debounce will only call again if it hasn't been called for 200ms
  var set_suggestions = throttle(function(stop) {
    if (!stop) {
      searchService.getSearchSuggestions( $scope.searchString )
        .then( function(data) {
          $scope.searchSuggestions = data;
      });
    } else {
      $scope.searchSuggestions = [];
    }
  }, 500);

  $scope.getSearchSuggestions = throttle(function() {
      if ($scope.searchString !== "") {
        set_suggestions();
      } else {
        $scope.searchSuggestions = [];
        set_suggestions(true);
      }
    }, 100);

  function throttle(fn, delay) {
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
  }

  // Plays the next video in videoQueue
  $scope.playNextVideo = function() {
    if ($scope.videoQueue.length > $scope.videoIndex + 1) {
      // get the next video
      $scope.videoIndex += 1;
      player.loadVideoById($scope.videoQueue[ $scope.videoIndex ].id);
    }
  };

  $scope.playPrevVideo = function() {
    if ($scope.videoIndex > 0) {
      $scope.videoIndex -= 1;
      player.loadVideoById($scope.videoQueue[ $scope.videoIndex ].id);
    }   
  };

  $scope.playVideo = function() {
    player.playVideo();
  };

  $scope.pauseVideo = function() {
    player.pauseVideo();
  };

  $scope.playNow = function(index) {
    video = $scope.videoQueue.splice(index, 1)[0];
    $scope.videoQueue.splice($scope.videoIndex + 1, 0, video);
    $scope.playNextVideo();
  };

  $scope.newSearch = function() {
    if ($scope.searchString) {
      // set currentlySearching to true so we only do one search at a time
      currentlySearching = true;
      // clear the search results because we are doing a new search
      $scope.searchResults = [];
      // set the storedSearchString for future searches
      storedSearchString = escape($scope.searchString);

      var queryString = "1&max-results=" + resultsPerQuery + "&q=" + 
        storedSearchString;

      // calls searchService's function getSearchResults, if the promise is 
      // fulfilled it adds the filtered information to the searchResults list
      searchService.getSearchResults( queryString )
        .then( function(response) {
          // promise fulfilled, push the filtered results to the list
          $scope.searchResults.push( response );
          currentlySearching = false;
        });
    }
  };

  $scope.loadMoreSearchResults = function() {
    if (storedSearchString && !currentlySearching) {
      currentlySearching = true;
      // queryIndex will start the search at the current location 
      // i.e. it will start the search at 41 if we've already done 4 searches
      // GData which is used for the searches starts at 1, not 0 (hence the +1)
      var queryIndex = $scope.searchResults.length * resultsPerQuery + 1;

      var queryString = queryIndex + "&max-results=" + resultsPerQuery +
        "&q=" + storedSearchString;

      // calls searchService's function getSearchResults, if the promise is 
      // fulfilled it adds the filtered information to the searchResults list
      searchService.getSearchResults( queryString )
        .then( function(response) {
          // promise fulfilled, push the filtered results to the list
          $scope.searchResults.push( response );
          currentlySearching = false;
        });
    }
  };

  // sets the global variable as loadMoreSearchResults for use with jQuery
  globalLoadMoreSearchResults = $scope.loadMoreSearchResults;

});

$(document).ready( function() {
  // windowLoadStart is a number which will affect the dynamic loading.
  // Currently this var is set so that loadMoreSearchResults will be called
  // when the window is .3 window height above the bottom of the document.
  var windowLoadStart = screen.height * 0.3;

  // Simple jQuery function checks to see if the browser window is at the bottom
  // of the page.  If the browser window is at the bottom of the page, then
  // using the globalLoadMoreSearchResults function, will load more results.
  $(window).scroll(function(){ 
    // checks to see if the window is currently at the bottom of the content
    if ($(window).scrollTop() >= 
        (($(document).height() - screen.height) - windowLoadStart)) { 
      globalLoadMoreSearchResults();
    }
  });
});
