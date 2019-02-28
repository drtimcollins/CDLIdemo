var camerazStartPreset = 100;
var aLight = {color:0xFFFFFF,intensity:1.5};
var pLight = 0xFFFFFF;
var ideal0 = { q: new THREE.Quaternion(0,0,0,1), p: new THREE.Vector3(0,0,0)};
var ideal1 = { q: new THREE.Quaternion(0,0,0,1), p: new THREE.Vector3(0,0,0)};
var fragmaterial = new THREE.MeshPhongMaterial({reflectivity: 1, shading: THREE.SmoothShading, shininess: 20, color: 0x909090});

var N = 1;
var container;
var camera, scene, renderer;
var textureLoader = new THREE.TextureLoader();
var isMouseDown = false;
var frags = new Array(N);
var controls = new Array(N);
var controlInfo;
var moveStart = new THREE.Vector2();
var oldPosition = new THREE.Vector3();
var pinchStart = 0;
var worldControl = null;
var directionalLight;

//var collisionOn = false;

//var isAnimating = false;
//var animateProgress = 0;
//var aRate = 1;
var cameraz = 100.0;
var camerazStart = 100.0;

var MODE = { ROTATE: 0, MOVE: 1, VIEW: 2, LIGHT: 3, NONE: 4};
var mode = MODE.VIEW;
var oldmode = MODE.VIEW;
var autoPhase = 0;
var isPinching = false;
var undoState = { world: null, controls: Array(N) };

var viewWidth = 640;
var viewHeight = 480;
var containerpos;

var msFlag = false;
var XMLHttpRequests = Array(N);

$(function () {
	// Setup iconbar
	var icons = $("<div>", { id: "iconbar" , class: "icons"});
	var lowericons = $("<div>", { id: "lowericonbar" , class: "icons"});
	icons.append($("<img>", { id: "rIcon", src: "3Dviewer/icons/rotate.svg", alt: "Rotate icon", title: "Rotate Fragment", onMouseDown: "mouseDownLightCheck();", onclick: "onRotateClick();", ontouchstart: "onRotateClick();" }));
	icons.append($("<img>", { id: "mIcon", src: "3Dviewer/icons/move.svg", alt: "Move icon", title: "Move Fragment", onMouseDown: "mouseDownLightCheck();", onclick: "onMoveClick();", ontouchstart: "onMoveClick();" }));
	icons.append($("<img>", { id: "vIcon", src: "3Dviewer/icons/view.svg", alt: "View icon", title: "Move Viewpoint", onMouseDown: "mouseDownLightCheck();", onclick: "onViewClick();", ontouchstart: "onViewClick();" }));
	icons.append($("<img>", { id: "uIcon", src: "3Dviewer/icons/undo.svg", alt: "Undo icon", title: "Undo", onMouseDown: "mouseDownLightCheck();", onclick: "onUndoClick();", ontouchstart: "onUndoClick();" }));
	icons.append($("<img>", { id: "fIcon", src: "3Dviewer/icons/fullscreen.svg", alt: "Fullscreen icon", title: "Fullscreen", onMouseDown: "mouseDownLightCheck();", onclick: "onFullScreenClick();", ontouchstart: "onFullScreenClick();" }));
	lowericons.append($("<img>", { id: "lIcon", src: "3Dviewer/icons/light.svg", alt: "Light icon", title: "Move Light Source", onMouseDown: "mouseDownLightCheck();", onclick: "onLightClick();", ontouchstart: "onLightClick();" }));
	$("#container").append(icons);
	$("#container").append(lowericons);
	updateIcons("#vIcon");
	$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', onFullScreenChange);

	var objectID = getURLParameter('ObjectID');
	var importModels = [{name:objectID, xoffset:0}];

    camera = new THREE.PerspectiveCamera(60, viewWidth / viewHeight, 1, 2000);
    if(camerazStartPreset != null)
        camerazStart = camerazStartPreset;
    cameraz = camerazStart;
	camera.position.z = cameraz;
    for(var n = 0; n < N; n++){
        controls[n] = new Arcball(viewWidth, viewHeight);
        if(importModels[n].xoffset == null)
            controls[n].position.x = 30*Math.cos(n*2*Math.PI/N);
        else
            controls[n].position.x = importModels[n].xoffset;
        if(importModels[n].yoffset == null)
            controls[n].position.y = 30*Math.sin(n*2*Math.PI/N);
        else
            controls[n].position.y = importModels[n].yoffset;
    }
	worldControl = new Arcball(viewWidth, viewHeight);
	saveState();

	// Set-up 3D scene and add lighting and camera
	scene = new THREE.Scene();
	//var ambient = new THREE.AmbientLight(0xffffff);
	var ambient;
	if(typeof aLight == "undefined")
		ambient = new THREE.AmbientLight(0xa0a0b0, 1.0);
	else
		ambient = new THREE.AmbientLight(aLight.color, aLight.intensity);	
	scene.add(ambient);
	//var directionalLight = new THREE.PointLight(0xffffd0, 0.9, 0, 0);
	if(typeof pLight == "undefined")
		directionalLight = new THREE.PointLight(0xd0d0e8, 0.55, 0, 0);
	else
		directionalLight = new THREE.PointLight(pLight, 0.55, 0, 0);
    camera.add(directionalLight);
    //oldLightPos = THREE.Vector3(150,150,-40);
    directionalLight.position.set(150, 150, -40);
    //directionalLight.position = oldLightPos;
	scene.add(camera);

    // Load 3D models
    for(var n = 0; n < N; n++)
    	loadFrag(importModels[n].name, n);	

	// Create the WebGL renderer and add to the web page
	//renderer = new THREE.WebGLRenderer({antialias: true});
    var aaflag = getURLParameter('antialias');
    if(aaflag == null) aaflag = false;
    renderer = new THREE.WebGLRenderer({antialias: aaflag});
	renderer.setSize(viewWidth, viewHeight);
	renderer.setClearColor($("body").css("background-color"));
	renderer.domElement.id = "threeDrenderer"
	$("#container").append(renderer.domElement);
	var propos = $("#container").offset().top;
	
	// Mouse handlers
	$('#container').on('mousedown', function (mouseData) {
		mouseData.preventDefault();
		onMouseDown(mouseData);
	});
	$('#container').on('touchstart', function (mouseData) {
		mouseData.preventDefault();
		if (mouseData.touches.length == 1) {
			onMouseDown(mouseData);
		} else {
			onPinchStart(mouseData);
		}
	});
	$('#container').mouseup(function () { isMouseDown = false; isPinching = false; });
	$('#container').mouseleave(function () { isMouseDown = false; isPinching = false; });
	$('#container').on('touchmove mousemove', function (mouseData) {
		mouseData.preventDefault();
		if (isPinching) {
			if (mouseData.touches.length < 2) {
				isPinching = false;
				onMouseDown(mouseData);
			} else {
				var t0 = new THREE.Vector2(mouseData.touches[0].pageX - mouseData.touches[1].pageX, mouseData.touches[0].pageY - mouseData.touches[1].pageY);
				//var dZ = pinchStart - t0.length();
				//cameraz += dZ / 10; 
				cameraz = camerazStart * pinchStart / t0.length();
				if (cameraz < 60) cameraz = 60;
				//var mid = midPoint(mouseData);
				//worldControl.drag(mid.x, mid.y, true);
			}
		}
		if (isMouseDown) {
			mouseData = fixOffset(mouseData);

			switch (mode) {
				case MODE.ROTATE:
					controls[controlInfo.index].drag(mouseData.offsetX - controlInfo.centre.x + viewWidth / 2, mouseData.offsetY - controlInfo.centre.y + viewHeight / 2, true);
					break;
				case MODE.MOVE:
					controls[controlInfo.index].drag(mouseData.offsetX, mouseData.offsetY, false);
					break;
				case MODE.VIEW:
					worldControl.drag(mouseData.offsetX, mouseData.offsetY, true);
                    break;
                case MODE.LIGHT:
                    setLight(mouseData);
                    break;
			}
		}
	});
	$('#container').on('mousewheel', function (mouseData) {
		mouseData.preventDefault();
		mouseData.stopPropagation();
		var delta = 0;
		if (mouseData.originalEvent.wheelDelta) {
			delta = mouseData.originalEvent.wheelDelta / 40;
		} else if (mouseData.originalEvent.detail) {
			delta = - mouseData.originalEvent.detail / 3;
		}
		cameraz -= delta;
		if (cameraz < 60) cameraz = 60;
	});
   
   $("#progress").offset({
      top: 200 + propos
   });
   $("#progress").show();	
   $("#cdlilink").text("Main CDLI archival view of " + objectID);
   $("#cdlilink").attr("href", "https://cdli.ucla.edu/search/archival_view.php?ObjectID=" + objectID);
	animate();
	if(N==1) onRotateClick();
});

function onMouseDown(mouseData) {
	mouseData = fixOffset(mouseData);
	controlInfo = findNearestFrag(mouseData.offsetX, mouseData.offsetY);

	switch (mode) {
		case MODE.ROTATE:
			controls[controlInfo.index].mouseDown(mouseData.offsetX - controlInfo.centre.x + viewWidth / 2, mouseData.offsetY - controlInfo.centre.y + viewHeight / 2, true);
			break;
		case MODE.MOVE:
			controls[controlInfo.index].mouseDown(mouseData.offsetX, mouseData.offsetY, false);
			calcMovementVector();
			break;
		case MODE.VIEW:
			worldControl.mouseDown(mouseData.offsetX, mouseData.offsetY, true);
            break;
        case MODE.LIGHT:
            setLight(mouseData);
            break;
	}
	isMouseDown = true;
}

function onPinchStart(mouseData) {
	var t0 = new THREE.Vector2(mouseData.touches[0].pageX - mouseData.touches[1].pageX, mouseData.touches[0].pageY - mouseData.touches[1].pageY);
	pinchStart = t0.length();
	camerazStart = cameraz;
	isPinching = true;
	isMouseDown = false;
}

function midPoint(mouseData) {
	var ret = new THREE.Vector2(0, 0);
	for (var n = 0; n < mouseData.touches.length; n++) {
		ret.add(new THREE.Vector2(mouseData.touches[n].pageX, mouseData.touches[n].pageY));
	}
	ret.divideScalar(mouseData.touches.length);
	return ret;
}

function onRotateClick() {
	updateIcons("#rIcon");
	if (mode != MODE.ROTATE) saveState();
	mode = MODE.ROTATE;
}
function onLightClick() {
	if(mode == MODE.NONE){
		switch(oldmode){
		case MODE.ROTATE:
			onRotateClick();
			break;
		case MODE.MOVE:
			onMoveClick();
			break;
		case MODE.VIEW:
			onViewClick();
	        break;			
		}
	} else {
		updateIcons("#lIcon");
		oldmode = mode;
		mode = MODE.LIGHT;
	}
}
function mouseDownLightCheck(){
    if(mode == MODE.LIGHT) mode = MODE.NONE;
}

function setLight(mouseData) {
	var mousePos = new THREE.Vector2(2.0*mouseData.offsetX/viewWidth - 1.0, 1.0 - 2.0*mouseData.offsetY/viewHeight);
	var len = mousePos.length();
	if(len > 1.0){
		mousePos.normalize();
		len = 1.0;
	}
    directionalLight.position.set(500.0 * mousePos.x, 500.0 * mousePos.y, 500*Math.sqrt(1.0 - len));
}

function onMoveClick() {
	updateIcons("#mIcon");
	if (mode != MODE.MOVE) saveState();
	mode = MODE.MOVE;
}
function onViewClick() {
	updateIcons("#vIcon");
	mode = MODE.VIEW;
}
function onUndoClick() {
	restoreState();
}

function onFullScreenClick() {
	elem = $('.container').get()[0];
	if (!document.fullscreenElement && !document.mozFullScreenElement &&
		!document.webkitFullscreenElement && !document.msFullscreenElement) {
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.msRequestFullscreen) {
			msFlag = true;
			elem.msRequestFullscreen();
		} else if (elem.mozRequestFullScreen) {
			elem.mozRequestFullScreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	} else {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	}
	if(mode == MODE.NONE) mode = MODE.LIGHT;
}

function onFullScreenChange() {
	if (!document.fullscreenElement && !document.mozFullScreenElement &&
		!document.webkitFullscreenElement && !document.msFullscreenElement) {
		// Set to normal
		viewWidth = 640;
		viewHeight = 480;
		$(".container").css({ position: 'relative' });
		$(".container").position({ top: 0, left: 0 });
		$("#threeDrenderer").css({border: "1px solid #A0A0A0"});
		$('#fIcon').attr("src", "3Dviewer/icons/fullscreen.svg");
	} else {
		// Set to full screen
		containerpos = $("#container").offset();
		viewWidth = screen.width;
        viewHeight = screen.height;
		$(".container").css({ position: 'fixed', top: 0, left: 0 });
		$("#threeDrenderer").css({border: "none"});
		$('#fIcon').attr("src", "3Dviewer/icons/unfullscreen.svg");
	}

    //$(".lowericonbar").position({ bottom: 10});
	$("#container").height(viewHeight);
	$("#container").width(viewWidth);	
	$(".container").height(viewHeight);
	$(".container").width(viewWidth);	
	renderer.setSize(viewWidth, viewHeight);
	camera.aspect = viewWidth / viewHeight;
	camera.position.z = cameraz;
	controls[0].resize(viewWidth, viewHeight);
	worldControl.resize(viewWidth, viewHeight);
}

function updateIcons(sel) {
	$("#iconbar").children('img').css('opacity', '0.4');
	$("#lowericonbar").children('img').css('opacity', '0.4');
    //$("#xIcon").css('opacity',collisionOn ? '1' : '0.4');
	$(sel).css('opacity', '1');
}
function saveState() {
    for(var n = 0; n < N; n++){
        undoState.controls[n] = controls[n].getState();
    }
	undoState.world = worldControl.getState();
}
function restoreState() {
	for(var n = 0; n < N; n++){
        controls[n].setState(undoState.controls[n]);
    }
	worldControl.setState(undoState.world);
}
function findNearestFrag(x, y) {
	var d = new Array(1e8, 1e8);
	var mid = new Array(new THREE.Vector4(0, 0, 0, 1), new THREE.Vector4(0, 0, 0, 1));
	for (var n = 0; n < N; n++) {
		if (frags[n]) {
			mid[n].applyMatrix4(frags[n].matrixWorld);
			mid[n].applyMatrix4(camera.matrixWorldInverse);
			mid[n].applyMatrix4(camera.projectionMatrix);
			mid[n].x = viewWidth / 2 * (1.0 + mid[n].x / mid[n].w) - x;
			mid[n].y = viewHeight / 2 * (1.0 - mid[n].y / mid[n].w) - y;
			mid[n].z = 0;
			mid[n].w = 0;
		}
	}
	var i = (N==1) ? 0 : (mid[0].length() < mid[1].length() ? 0 : 1);
	controls[i].viewRotation = worldControl.rotation;
	var ret = { index: i, centre: new THREE.Vector2(mid[i].x + x, mid[i].y + y) };
	return ret;
}

function calcMovementVector() {
	var Ax = new THREE.Vector3(1.0, 0, 0);
	var Ay = new THREE.Vector3(0, -1.0, 0);
	var camRot = new THREE.Quaternion();
	camRot.copy(worldControl.rotation);
	camRot.conjugate();
	Ax.applyQuaternion(camRot);
	Ay.applyQuaternion(camRot);
	var sFactor = new THREE.Vector4(1.0, 1.0, 1.0, 1.0);
	sFactor.applyMatrix4(camera.projectionMatrix);

	var mid = new THREE.Vector4(0, 0, 0, 1.0);
	mid.applyMatrix4(frags[controlInfo.index].matrixWorld);
	mid.applyMatrix4(camera.matrixWorldInverse);

	Ax.multiplyScalar(-2.0 * mid.z / viewWidth / sFactor.x);
	Ay.multiplyScalar(-2.0 * mid.z / viewHeight / sFactor.y);
	controls[controlInfo.index].setVectors(Ax, Ay);
}

function loadFrag(objectID, fragIndex){
    var loader = new THREE.PLYLoader();
    loader.load('models/' + objectID + '.ply', function(geometry) {
       geometry.computeBoundingSphere();
       geometry.computeFaceNormals();
       geometry.computeVertexNormals();

	   var material;
	   if(typeof fragmaterial == "undefined")
			material = new THREE.MeshPhongMaterial({
				reflectivity: 1,
				shading: THREE.SmoothShading,
				shininess: 35,
				color: 0x909090
			});
		else
			material = fragmaterial;
       textureLoader.load('models/' + objectID + '.jpg', function(texture) {
			// OnLoad function
			material.map = texture;
			frags[fragIndex] = new THREE.Mesh(geometry, material);
			scene.add(frags[fragIndex]);
			$("#progress").hide();
       },undefined,function(){
			// OnError function
			frags[fragIndex] = new THREE.Mesh(geometry, material);
			scene.add(frags[fragIndex]);
         });
    }, function() {} );
 }

function animate() {
	requestAnimationFrame(animate);
	var A = Array(null, null);
	for (var n = 0; n < N; n++) {
		if (frags[n]) {
			frags[n].setRotationFromQuaternion(controls[n].rotation);
			frags[n].position.copy(controls[n].position);
			frags[n].updateMatrix();
			A[n] = frags[n].matrix.clone();
		}
	}
	var camRot = new THREE.Quaternion();
	camRot.copy(worldControl.rotation);
	camRot.conjugate();

	camera.position.set(0, 0, cameraz);
	camera.position.applyQuaternion(camRot);
	camera.up.set(0, 1.0, 0);
	camera.up.applyQuaternion(camRot);
	camera.updateProjectionMatrix();
	camera.lookAt(scene.position);

	renderer.render(scene, camera);
}

// Function to extract query string data from the page URL
function getURLParameter(name) {
	return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function fixOffset(event) {
	if (event.type == 'touchmove' || event.type == 'touchstart') {
		event.pageX = event.touches[0].pageX;
		event.pageY = event.touches[0].pageY;
	}
	if (!event.offsetX) {
		event.offsetX = (event.pageX - $(event.target).offset().left);
		event.offsetY = (event.pageY - $(event.target).offset().top);
	}
	return event;
}