# Okrajs
Simple Access Control for `postMessage` API in Unmodified Browsers.


##How to Use it
First install it using bower:

    $ bower install okrajs

Or checkout the latest version using git:

    $ git clone https://github.com/Okrajs/Okrajs.git
  


Include `okra.js` in your html file:

     <script src="bower_components/okrajs/okra.js"></script>
     


###Interface Definition and Access Control
Define your own interfaces using `Okra.provide` and let others using it by `allow`ing them:

    Okra.provide('call', 'stop', function () {
        video.stopVideo();
        image.style.display = "block";
        clearInterval(currentTimeInterval);
    }).allow('http://www.omardo.com')
      .allowReferrer();
    
    Okra.provide('get', 'duration', function () {
        if (video.getDuration) {
            return video.getDuration();        
        }

        return 0;
    }).allow('https://github.com');
    

###Consuming External Interfaces
Include Okra script and the iframe in the integrator's code:

    <script src="bower_components/okrajs/okra.js"></script>
    <iframe name="www.videosforyou.in" width="720" height="405"
            src="http://www.videosforyou.in/youtube-video.html"></iframe>
                
Define an Okra `inlet` to be able to access the frame:

    var video = Okra.inlet(
        'www.videosforyou.in', 
        'http://www.videosforyou.in'
    );
    
Consume the interface:

    video.call('stop');
    
    video.get('duration', function (duration) {
        console.log('duraction =', duraction);
    });


##Okra's Basic Actions
By default Okra defines four actions (or forms of interaction) between the Mashup components:

###`get`
Allow others to get a value:
    Okra.provide('get', 'duration', function () {
        return 10;
    }).allow('https://github.com');


##`set`
    Okra.provide('set', 'pageTitle', function (pageTitle) {
        document.title = pageTitle;
    }).allow('https://facebook.com');

    
##`call`
    Okra.provide('call', 'play', function () {
        video.play();
    }).allow('https://youtube.com');


##`event` and `on`
    var event = Okra.provide('event', 'play')
                     .allow('https://youtube.com');
    event.emit({
      videoTitle: "Saving Private Rayan"
    });
    
    // The consumer side:
    inlet.on('play', function (data) {
      console.log('Video Title:', data.videoTitle);
    });
    
##Using Custom Load Event
An Okra child, by default sends a `childLoad` event on `document.load` event to it's parent. This allows the parent to buffer the events until the child is loaded. 

To override the timing of the event, you can use `Okra.useManualLoadEvent()` and `Okra.emitLoadEvent()` e.g.

    Okra.useManualLoadEvent();
    window.onYouTubePlayerReady = function () {
        Okra.emitLoadEvent();
    };
