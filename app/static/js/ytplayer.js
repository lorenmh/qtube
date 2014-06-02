
/**
 * Angular Application 'QueueTube'
 * 
 * ytplayer.js - 
 * Holds the YouTube iFrame API script
 *
 * Work in Progress, first created late Dec 2013
 * Created by Loren Howard, lorenhoward.com
 */

var player;

//Is called by the YouTube API when it is loaded and ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: '6pOq4hyoX9g',
    playerVars: {
      'controls': 0,
      'iv_load_policy': 3,
      'showinfo': 0
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    // this grabs the scope of the PlayerController
    var scope = angular.element(document.getElementById('player-controller'))
      .scope();
        
    if (scope.videoQueue.length > 0) {
      //then the playNextVideo function is called
      scope.playNextVideo();
      //then the $apply function is called to update the changes in the scope
      scope.$apply();
    }
  }
}

function stopVideo() {
  player.stopVideo();
}


// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  if (event.data != YT.PlayerState.PAUSED) {
    event.target.playVideo();
  }
}