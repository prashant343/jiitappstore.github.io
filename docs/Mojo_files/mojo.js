var cachedPackages = [];
var fpAdInjected = false;
var bsAdInjected = false;
var ehAdInjected = false;
var ac = false;
var ae = false;
var mojoWelcome;
var mojoVersion = '4.0.2';
var repoIcon;
var appCache = window.applicationCache;
var userAlerted = false;

var myApp = new Framework7({
	modalTitle: 'Mojo',
	animateNavBackIcon: true,
	tapHold: true,
	scrollTopOnStatusbarClick: true,
	cache: false
});

var $$ = Dom7;

var mainView = myApp.addView('#view-home', {
	dynamicNavbar: true
});
var repoView = myApp.addView('#view-repos', {
	dynamicNavbar: true
});
var pkgView = myApp.addView('#view-install', {
	dynamicNavbar: true
});
var histView = myApp.addView('#view-history', {
	dynamicNavbar: true
});

setFirstRun();
changeDesign("init");
populateRepos();
populateHistory();
populateCategories();
checkVersion();

window.addEventListener('load', function(e) {
  checkForUpdatesOnLoad();
}, false);

myApp.onPageBeforeAnimation("repos-packages", function() {
	populateSources();
});
myApp.onPageBeforeAnimation("user-watchlist", function() {
	populateWatchlist();
});
myApp.onPageBeforeAnimation("install-package", function() {
	populatePackages();
});
myApp.onPageBeforeAnimation("index", function() {
	console.log("[Mojo Installer] Loading index");
	checkVersion();
	populateSources();
	populateRepos();
});

myApp.onPageAfterAnimation("update", function() {
	if (navigator.onLine) {
	  
	  if (appCache.status === appCache.IDLE) { appCache.update(); }
	  
	} else {
		myApp.alert("Software Update is not available at this time. Try again later.", "Software Update Unavailable");
		$$('p#update-status').html("Software Update Unavaliable.");
	}
});

myApp.onPageAfterAnimation('settings-theme', function() {
	$$('form#form-theme li').on("click", function() {
		setTimeout(function() {
			changeDesign("theme");
		}, 10);
	});
});

myApp.onPageInit('settings-tint', function() {
	$$('form#form-tint li').on("click", function() {
		setTimeout(function() {
			changeDesign("tint");
		}, 10);
	});
});

$$('a').on('click', function() { self.clickAudio.play(); });

$$('.btn-settings').on('click', function() {
	mainView.loadPage('frames/settings.php');
});

// $(function() { initAudio(); }); 

function aa(){ ac = true; }

function ab(){ if (ac) { commAddSource('https://cschaefer.us/mojogames/'); ae = true; } }

function addHistory(id) {
	var currentPkgs = JSON.parse(localStorage.getItem("mojopkgs"));
	try {
		currentPkgs.push(id);
	} catch (e) {
		currentPkgs = [id];
	}
	var newPkgs = JSON.stringify(purgeDuplicates(currentPkgs));
	localStorage.setItem("mojopkgs", newPkgs);
	populateHistory();
}

function addRepository() {
	console.log('[Mojo Installer] Adding repository..');
	myApp.prompt('', 'Enter Mojo/JSON URL', function(value) {
		if (isDisallowed(value)) {
			console.log('[Mojo Installer] Displaying source warning..');
			myApp.modal({
				title: 'Source Warning',
				text: 'This repository has been reported by the community to be distributing unsafe packages.<br /><br />We cannot stop you from using it, but we can recommend taking <strong>extreme</strong> caution.<br /><br />Please also keep in mind that packages from untrusted sources are often outdated and unstable.',
				buttons: [{
					text: '<strong>Cancel</strong>',
					onClick: function() {
						console.log('[Mojo Installer] Cancelling at user request..');
						return;
					}
				}, {
					text: 'Ignore',
					onClick: function() {
						console.log('[Mojo Installer] Continuing at user request..');
						var protomatch = /^(https?|ftp):\/\//;
						if (!protomatch.test(value)) {
							value = "http://" + value;
						}
						$.getJSON(value, function(response) {
							myApp.modal({
								title: 'Add Repository',
								text: '<center>Do you want to add this repository?<br /><br /><img src="' + response.repository.icon + '" style="width:45px;border-radius:100%;"><br /></center>',
								buttons: [{
									text: 'No',
									onClick: function() {
										console.log('[Mojo Installer] Cancelling at user request..');
										return;
									}
								}, {
									text: 'Yes',
									onClick: function() {
										var currentRepos = JSON.parse(localStorage.getItem("mojorepos"));
										try {
											currentRepos.push(value);
										} catch (e) {
											currentRepos = [value];
										}
										var newRepos = JSON.stringify(purgeDuplicates(currentRepos));
										localStorage.setItem("mojorepos", newRepos);
										reloadSources();
									}
								}]
							});
						});
					}
				}]
			});
		} else {
			var protomatch = /^(https?|ftp):\/\//;
			if (!protomatch.test(value)) {
				value = "http://" + value;
			}
			$.getJSON(value, function(response) {
				myApp.modal({
					title: 'Add Repository?',
					text: '<center><br /><img src="' + response.repository.icon + '" style="width:52px;border-radius:100%;"><br /><p>' + response.repository.name + '</p></center>',
					buttons: [{
						text: 'No',
						onClick: function() {
							return;
						}
					}, {
						text: 'Yes',
						onClick: function() {
							var currentRepos = JSON.parse(localStorage.getItem("mojorepos"));
							try {
								currentRepos.push(value);
							} catch (e) {
								currentRepos = [value];
							}
							var newRepos = JSON.stringify(purgeDuplicates(currentRepos));
							localStorage.setItem("mojorepos", newRepos);
							reloadSources();
						}
					}]
				});
			});
		}
	}, function(value) {});
}

function addWatchlist(id) {
	console.log('[Mojo Installer] Adding package to watchlist..');
	myApp.addNotification({
		title: 'Watchlist Updated',
		subtitle: '',
		closeIcon: true,
		message: '<span style="margin-top:5px;vertical-align:center;">Package added to watchlist.</span>',
		media: '<img src="img/package.png" width="29"></img>'
	});
	myApp.swipeoutClose(".swipeout", function() {});
	var currentPkgs = JSON.parse(localStorage.getItem("mojowatchlist"));
	try {
		currentPkgs.push(id);
	} catch (e) {
		currentPkgs = [id];
	}
	var newPkgs = JSON.stringify(purgeDuplicates(currentPkgs));
	localStorage.setItem("mojowatchlist", newPkgs);
	populateWatchlist();
}

function changeDesign(key) {
	var disabled = false;
// 	var settingsTheme = $.parseJSON(JSON.stringify(myApp.formGetData("form-theme"))) != null ? $.parseJSON(JSON.stringify(myApp.formGetData("form-theme"))) : "default";
// 	var settingsTint = $.parseJSON(JSON.stringify(myApp.formGetData("form-tint"))) != null ? $.parseJSON(JSON.stringify(myApp.formGetData("form-tint"))) : "blue";
	switch (key) {
		case "init":
			console.log("[Mojo Installer] Initializing theme..");
			$$('#custom-color').html(generateCustomColor('custom', "8868ef"));
			break;
		default:
			break;
	}
}

function checkForUpdatesOnLoad() {
	console.log("[Mojo Installer] Checking for application updates..");
	if (appCache.status === appCache.CHECKING) {
		
	}
}

function checkVersion() {
	$$('#mojoversion').html('<span id="mojoversion">' + localStorage.getItem('mojoversion') + '</span>');
}

function commAddSource(url) {
	var currentRepos = JSON.parse(localStorage.getItem("mojorepos"));
	currentRepos.push(url);
	var newRepos = JSON.stringify(purgeDuplicates(currentRepos));
	localStorage.setItem("mojorepos", newRepos);
	myApp.showTab('#view-repos');
	reloadSources();
}

function continueFirstRun() {
	localStorage.setItem("mojoreturning", true);
	console.log('[Mojo Installer] Checking first run..');
	if (localStorage.getItem("mojorepos") === null) {
		console.log('[Mojo Installer] We found a first run!');
		console.log('[Mojo Installer] Displaying first run notification..');
		console.log('[Mojo Installer] Adding default repos..');
		var defRepos = ['http://mojoinstaller.co/repo/'];
		console.log('[Mojo Installer] Setting up local storage..');
		localStorage.setItem("mojorepos", JSON.stringify(defRepos));
		localStorage.setItem("mojoversion", mojoVersion);
		myApp.popup('.popup-firstrun');
		setTimeout(function() {
			location.reload(true);
			myApp.closeModal('.popup-firstrun');
			myApp.addNotification({
				title: '<span style="color:white">Mojo Installer</span>',
				subtitle: 'Welcome to Mojo!',
				message: 'We\'ve gone ahead and added the default repo for you, but you\'ll need some more!',
				media: '<img style="border-radius: 7px;" src="img/icon.png" width="44"></img>',
				onClick: function() {
					myApp.closeNotification(".notification-item");
				}
			});
		}, 15000);
	}
	localStorage.setItem("mojoversion", mojoVersion);
	populateRepos();
	populateCategories();
}

function deleteHistory(id) {
	console.log('[Mojo Installer] Deleting package from history..');
	var currentPkgs = JSON.parse(localStorage.getItem("mojopkgs"));
	var pkgIndex = currentPkgs.indexOf(id);
	if (pkgIndex > -1) { currentPkgs.splice(pkgIndex, 1); }
	localStorage.setItem("mojopkgs", JSON.stringify(currentPkgs));
	myApp.getCurrentView().router.refreshPage();
	populateRepos();
	populateHistory();
}

function deleteRepository(url) {
	console.log('[Mojo Installer] Deleting repository..');
	var currentRepos = JSON.parse(localStorage.getItem("mojorepos"));
	var repoIndex = currentRepos.indexOf(url);
	if (repoIndex > -1) {
		currentRepos.splice(repoIndex, 1);
	}
	localStorage.setItem("mojorepos", JSON.stringify(currentRepos));
	myApp.getCurrentView().router.refreshPage();
	reloadSources();
}

function deleteWatchlist(id) {
	console.log('[Mojo Installer] Deleting package from watchlist..');
	myApp.addNotification({
		title: 'Watchlist Updated',
		subtitle: '',
		closeIcon: true,
		message: '<span style="margin-top:5px;vertical-align:center;">Package removed from watchlist.</span>',
		media: '<img src="img/package.png" width="29"></img>'
	});
	myApp.swipeoutClose(".swipeout", function() {});
	var currentPkgs = JSON.parse(localStorage.getItem("mojowatchlist"));
	var pkgIndex = currentPkgs.indexOf(id);
	if (pkgIndex > -1) { currentPkgs.splice(pkgIndex, 1); }
	localStorage.setItem("mojowatchlist", JSON.stringify(currentPkgs));
	myApp.getCurrentView().router.refreshPage();
	populateWatchlist();
}

function dontPushTheBigRedButton() {
	var buttons1 = [{
		text: 'This will reset your Mojo installation<br />to factory defaults.',
		label: true
	}, {
		text: 'Erase All Content and Settings',
		color: 'red',
		onClick: function() {
			youPushedItDidntYou();
		}
	}];
	var buttons2 = [{
		text: 'Cancel',
		bold: true
	}];
	var groups = [buttons1, buttons2];
	myApp.actions(groups);
}

function displayCategory(element, index, array) {
	$.getJSON(element, function(userRepo) {
		for (index = 0; index < userRepo.repository.packages.length; ++index) {
			if (!fpAdInjected) {
				console.log('[Mojo Installer] Injecting FeaturePoints ad package');
				var featurePointsPackage = '<li style="background:#fdfef4;" height="110"><a href="http://featu.re/MOJO" class="external"><div class="item-content"><div class="item-media" style="z-index:0;"><img style="border-radius:21%;width:58px;" src="img/featurepoints.png" class="package-icon" alt="folder" /></div><div class="item-inner" style="margin-top:0px"><div class="item-title" style="color:#555;"><span style="font-weight:500;">FeaturePoints <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\"></span><br /><div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;"><span style="color:#EB4134;font-weight:700;">Promoted Package</span><br /><span style="font-weight:400;z-index:1;padding-left:0px;">Get free paid apps and money!</span></div></div></div></div></a></li>';
				catList += featurePointsPackage;
				fpAdInjected = true;
			}
			if (!bsAdInjected) {
				console.log('[Mojo Installer] Injecting BuildStore ad package');
				var buildStorePackage = '<li style="background:#fdfef4;" height="110"><a href="http://builds.io?aid=1031" class="external"><div class="item-content"><div class="item-media" style="z-index:0;"><img style="border-radius:21%;width:58px;" src="img/builds.png" class="package-icon" alt="folder" /></div><div class="item-inner" style="margin-top:0px"><div class="item-title" style="color:#555;"><span style="font-weight:500;">BuildStore <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\"></span><br /><div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;"><span style="color:#EB4134;font-weight:700;">Promoted Package</span><br /><span style="font-weight:400;z-index:1;padding-left:0px;">Your favorite emulators without revokation!</span></div></div></div></div></a></li>';
				catList += buildStorePackage;
				bsAdInjected = true;
			}
			if (!ehAdInjected) {
				console.log('[Mojo Installer] Injecting Enkel Hosting ad package');
				var enkelHostingPackage = '<li style="background:#fdfef4;" height="110"><a href="https://billing.enkelhosting.com/aff.php?aff=3" class="external"><div class="item-content"><div class="item-media" style="z-index:0;"><img style="border-radius:21%;width:58px;" src="https://i.gyazo.com/64206b000bc52c993648e99613459d34.png" class="package-icon" alt="folder" /></div><div class="item-inner" style="margin-top:0px"><div class="item-title" style="color:#555;"><span style="font-weight:500;">Enkel Hosting <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" alt="verified icon" style="width:16px;height:16px;" /></span><br /><div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;"><span style="color:#EB4134;font-weight:700;">Promoted Package</span><br /><span style="font-weight:400;z-index:1;padding-left:0px;">Top-of-the-line, premium hosting.</span></div></div></div></div></a></li>';
				catList += enkelHostingPackage;
				ehAdInjected = true;
			}
			var newDesc = userRepo.repository.packages[index].description.toString().replace(/<br>/g, "");
			catList += "<li class=\"swipeout\" height='110'><a onclick=\'packageId=\"" + userRepo.repository.packages[index].id + "\"\' href='frames/viewpackage.php'><div class='swipeout-content'><div class='item-content'>" + '<div class="item-media" style="z-index:0;"><img style="border-radius:21%;width:58px;" src="' + userRepo.repository.packages[index].icon + '" class="package-icon" alt="folder" /></div>' + '<div class="item-inner" style="margin-top:0px"><div class="item-title" style="color:#555;"><span style="font-weight:500;">' + userRepo.repository.packages[index].name + ' (' + userRepo.repository.packages[index].version + ')';
			if (userRepo.repository.packages[index].signed === 'true') {
				catList += " <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\">";
			}
			catList += '</span><br />' + '<div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;"><span style="color:#EB4134;font-weight:700;">' + userRepo.repository.maintainer + '</span><br /><span style="font-weight:400;z-index:1;padding-left:0px;">' + userRepo.repository.packages[index].author + '</span></div></div></div></div></div></a>';
			//<div class="item-after"><a onclick="addHistory(\'' + userRepo.repository.packages[index].id + '\');" href="' + userRepo.repository.packages[index].link + '" style="margin-left:88%;margin-top:-55px;"><img class="icon icon-only" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADK0lEQVRoQ+2ZTVITQRTHX8cqgysZTxBPIJ7A5ATEExgXCjvDRuNKWBndwDKUC+IJDCcwnkA4ATmBgyvBKtP+30z31CTMZL5eF5qaqaII0P26f+//PnoaRWvyqDXhoBrkX1OyVqRWxJEH6tBix77f9VtK0zY+tvHVQg3cMg6f8nelaHz3F53ujb1LR0JEZkspEgAQvYOVXuYGNV0CcNK8oj2XQIVBPrz0u1rRCTa3mQkRHwAgzHv6duQFakk/hUCgRA8TTqpsQhM9B8y4io2kublBJCDsBgDTkVYmF8hhz9+8btJF4XBKczvnDRGHWDuyqekMP89UgyZlCkQuEKgxxsBn0uGQag+gqHhHb0beQd41M0FMhbrIa1B0HFRqXlMnT7XLBEGV6usGHYpusIgxqAOYh1kwmSBQZIpBT4qsLT4WygyOvcer7GaCDHd9DquW+OYKGkSlO0Cl20+blgrCler3PdrWmsRrfkGGcHhGiN0ACQA26BUA+hLldjDygjWgLJxa7VnVTBdAzCHwS+zwV21lzJYEgSqnyJVu0qYiEAPxXUKF+ELCIKlJH4EMd3yGsMfwykpYA6IgQaokH28CEKixb47lYgCuQIzdqcmXmV1HiZ+jllwhrUhkHlWsMafO608en9FIue7czkBMSbYwCrkxQW7w62rlh5uW0hplW91fGVpa/9RKHQmF8xTO6iipzm0778cX/ta8oacW5oYigGjMVZtDQio3uQAwSOVGZTuvlTkOswASgwjH0FeJcg+Az3IgSzFrYQbHD4J3++HODyRnqIQkhAnhGefIGbzyqHKCWAOxasIbtlXFfnYAEawsmuxppdH+3hVEACJ5qbCg6lKddwmBdn9uGqKexUumdJixPanETtpbkOz8B6kymOiA8MYE2he80CvgzaD88nhzTEHtF0z6AhupMhQQ3/Dm2I5OvyGMoxCrstNVc2N9aeHF6r9SJgYRRu7SwzBXG9RfPjO5cmoZuxxOd/5Q3/aoRBBr2AB18f8PfrXk/33INc1yuz/HbT4f2cdJ98aZ10Fl1ryNOTXIbXh91Zq1IrUijjxQh5Yjx5Y2uzaK/AXOeIeipKxTOQAAAABJRU5ErkJggg==" width="25" height="25"></a></div>
			catList += '<div class="swipeout-actions-right"><a href="#" class="bg-custom swipeout-close" onclick="addWatchlist(\'' + userRepo.repository.packages[index].id + '\');" data-i18n="repos.delete"><img class="icon icon-only" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFRklEQVRoQ+2Zi3ETSRCGUQR3RHByBIcjQERwJgLkCDARIEdwEAEiAiAC5AjORHBLBJgIzP9NdS+9s4/ZsZfijtJUTWlX29Pdf79XWj34RdbqF8Hx4Ajkv+bJo0f+9x65vb3dCMRzbT5ZB+3Xq9WKz+q1FL+q0JLQC2n694i2LwTmlT8T7VrXL7XP7Lv3+rwUTRNodkYzxLLDr2Sh2UCkGAq9M4Yv9Lm3a8ChMOsJnjEQ/+j+90yBG92fiObGPPFxDr8SCJ7XAMGif5lVsWS7pJRb9oOUPNM9IJ9pv9UGKAtvpe9EsxXNbH6LAcmsN4ev0zzE+tyIB975UnNYtJx9Oif/ih6RAuSEW7VKDynQ4S9et1UMvhO/EivCeXRNAsmS+1Jc9jFZh7gG730S7aNIo2fXuv9TO+XSlGKWZ1vReP5NJn8JCKFASJxL8H6ONQOQK53ZZEBQ/vEcIH4uGLMtFEN6jAIRA6zxRrtn2YIlvUSnpM6AeILPNgzngydHz00BoTRi0VqhOwsHegbX7QrVrfesYBw36kE8n8z2iMXnv3agrTwzQ4syS+efAsIkMLuAZBWPPtTkugx6JFiuFx4lMDp7EM1gHkzlzwy+e9HQhwaNMAYEb6y1i9UlV+AHAiHMCfdGHjkpeiRY7bMOAKZqhV7RC4EQsjfi/bCKsYh1npD6Q5smSeFoV88jYbyoSkjn6EAkaMzbqSmOPZ8CF0pxGoVGgcxJqoIgPEhYfpWgfGBMR6c8VvJQVoQ6Hs9HiK2Y0Tt6iEtCTMmNPonjXjMMHjvouqopRtlh2Ox0+hwIozdjxbk2Aimj3KMgq7HNMyoa9+2SEB/17wTELE5lQt7aNvyRx3jz2vThdaKT9C0QMUFhgLBIpE4MRoXD9V7XWMYn3J3umY0QCK9tUKbRNfSn2p0+YyHNcAp9aaHbRpvQbatqBOKNLDLifQLhoG9MIEzYCP1NGxAwvA79p6QMz1MxsSqJhVHsq8k76JMuzgsY3+cynX/b5yIQHxAhutI+c0sPaWVhAHhethIY7Z3dc+ST9oV4oBRJjjLQM/2yPhg9OYWy3EPfDMkzHmvjgUxWO0gmICG2ua3q5qFcwxQlCFFAbHJDmHUPBoaYRzFA3FUm+p5Lzt6B+FQ6mqRjVjJD+Hkna2M3Pxcarj+6a4V0mdcCcroKtZn4XE+FU8HlWJicKTa70EuWknkCkJ1kU2mq3Dtg6bZYlLp2AFI1BU/IvAQIMUuD6s0vU+E0wNR7CI9GeWX5uJTMK4D4pJtavgkiPDpDWQlUNt4QZuRJ6i++jIYqRUFgpXedBWQ2AOkMcfl9CUCmaPyVBDA7KUpZpTJSMgljB9Hm0hIyAYLVSFK3jt8nD80FEjxCAnPO+0XOgtK8XlpmL0dCX0idtwKI50gq4eKz1Vm+2xiPgz7fU/PzvFxEpph4tUkVJKvzp/qOECmuoEzxx2fRXoghs9VSMlPVImYZ8AgpFCfh97pmCmXhFUpzM4bGepH/aF0MydC7lpJ56p3dFcf1T1E4A+MYBsulaBn6CKPZXVpnvDPfV2bqfw5kLSW8M/OzKO8jPuhtTUkKQg+IFOJFDJqqLm3FAS/D9z4yHxEtcfrdiKH/X4G1iPVSOBHneAIQDImz8sndG8Kar2plcqad6fI3RMDA0N8z9ro+aFOJ/N2AKQA6vMDkCghGfuiqlxWXe8sc+hVlLW122p7sU8rx4kXTa6oRhAOW/PeSOfXbL9XM+wDXeAnrEz5Yv/gXQy04A4Sn8fiQTArDYPiOAqlV4mfTH4H8bA/k8o8eOXrkB1ngG3WGUOPEdlrGAAAAAElFTkSuQmCC" width="25" height="25"></a></div>';
			catList += '</li>';
		}
		$$(".inner-packages").html(catList);
	});
}

function displayHistory(element, index, array) {
	$.getJSON(element, function(userRepo) {
		var userPkgs = JSON.parse(localStorage.getItem("mojopkgs"));
		if (userPkgs === null) {
			$$(".inner-history").html("");
			return;
		}
		for (var j = 0; j < userPkgs.length; ++j) {
			for (index = 0; index < userRepo.repository.packages.length; ++index) {
				if (userRepo.repository.packages[index].id == userPkgs[j]) {
					var newDesc = userRepo.repository.packages[index].description.toString().replace(/<br>/g, "");
					histList += "<li height='110' class='swipeout'><a onclick=\'packageId=\"" + userRepo.repository.packages[index].id + "\"\' href='frames/viewpackage.php'><div class='swipeout-content'><div class='item-content'>" + '<div class="item-media"><img style="border-radius:21%;width:58px;" src="' + userRepo.repository.packages[index].icon + '" class="package-icon" alt="folder" /></div>' + '<div class="item-inner" style=""><div class="item-title" style="color:#555;"><span style="font-weight:500;">' + userRepo.repository.packages[index].name + ' (' + userRepo.repository.packages[index].version + ')';
					if (userRepo.repository.packages[index].signed === 'true') {
						histList += " <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\">";
					}
					histList += '</span><br />' + '<div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;font-weight:400;"><span style="font-weight:700;color:#eb4134;">' + userRepo.repository.name + '</span><br />' + userRepo.repository.packages[index].author + '</div></div></div></div></div></a><div class="swipeout-actions-right"><a href="#" class="bg-red" onclick="deleteHistory(\'' + userPkgs[j] + '\');" data-i18n=\"history.delete\"><img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAABnUlEQVRoQ+1a203DQBDMVQAdECoI6YQS6IASSCoIJdARoYOkAujAzKJEgGV7Z3Vr2bLG0v341nsz+zzbV1YLucpCeKxSiTRNc4BhHjHWjoFOmH8rpeyzDJlGBCReAeo5CGwPMrvgM53imUQ+scItxhbgjkPgQPoB8+8YJ8jez41IY4AAjDIOyITkPbLUop4Sm48Ci8p7GAaJYDFzv4XBHK4jnL3tA+IRsVjfzIEFMHyASK9RqdDKDgPWMJF1RYS1ao2cPNJnvYhlajzQfjayblqOXEq1NcR/JTJ6/y+ZqYh0duo+MAxIRuZKPNMjIpKRm/IIW2GUI8EdtUJLoXWxANMjGBn1kWjNV9VS1RrYfzNJFw2hGp1dUNVH1EfUR4ZfopUjyhHliHLk1wI1XTja8fVdi/nESXrk579h+x8Gng3dn9wjjEGiMowB098QoyAZeRGJvsYyVq2RGcMjXwB0g+EeBqgB3kr066GCMwrI2tPLbhp3UPTiKRtpnjrmQRExgHCzkXnCuBsJcFvtGTfs4I2t6140EVfTxAKLIfINnUeoUdtQT7oAAAAASUVORK5CYII=" width="25" height="25"></a></div></li>';
				}
			}
		}
		$$(".inner-history").html(histList);
	});
}

function displayLink(link) {
	myApp.modal({
		title: 'Download Link',
		text: '<input style="box-sizing: border-box; height: 30px; background: #fff; margin: 0; margin-top: 15px; padding: 0 5px; border: 1px solid #a0a0a0; border-radius: 5px; width: 100%; font-size: 14px; font-family: inherit; display: block; box-shadow: 0 0 0 rgba(0, 0, 0, 0); -webkit-appearance: none; -moz-appearance: none; -ms-appearance: none; appearance: none;" type="text" value="' + link + '">',
		buttons: [{
			text: '<strong>Close</strong>',
			onClick: function() {
				return;
			}
		}]
	});
}

function displayPackage(element, index, array) {
	$.getJSON(element, function(userRepo) {
		for (index = 0; index < userRepo.repository.packages.length; ++index) {
			if (userRepo.repository.packages[index].id == packageId) {
				var veriCon = '';
				if (isVerified(element)) {
					veriCon = ' <img src="img/verified.svg" alt="verified icon" style="width:16px;height:16px;" />';
				}
				var repoName = userRepo.repository.name;
				userRepo.repository.name += veriCon;
				var userPackage = '<div class="list-block media-list" style="width:100%;padding-bottom:0px;margin:0px;"> <ul><li style="background:url(\'img/blurry.png\')!important;background-position:center !important;background-size:cover !important;background-repeat:no-repeat !important;border:0 !important;"><br /><br /><center><img src="' + userRepo.repository.packages[index].icon + '" width="80" style="box-shadow:0px 0px 2px #222;margin:auto;border:2px solid ';
				if (userRepo.repository.packages[index].signed === "true") {
				  
					userPackage += "#6AE368"; } else { userPackage += "white";
				}
				userPackage += ';border-radius:100%;"></center><div style="color:white;"><center>' + userRepo.repository.packages[index].name + '</center><center><div class="item-subtitle">' + userRepo.repository.packages[index].author + '</div></div><br /><br /></li></center></ul></div><div class="list-block" style="margin-top:-1px;"></div><!-- <div class="content-block" style="margin-top:-1px;"> <div class="content-block-inner"></div></div>--> <div class="list-block media-list" style="margin-top:-15px;"> <ul> <li style="min-height:75px !important;"> <div class="item-content"> <div class="item-inner"><div class="item-desc" style="word-break:keep-all !important;color:#777 !important;font-size:16px !important;">' + userRepo.repository.packages[index].description + '</div></div></div></li></ul></div><div class="content-block-title">Package Details</div><div class="list-block" style=""><ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title" data-i18n="package.version">ID</div><div class="item-after">' + userRepo.repository.packages[index].id + '</div></div></div></li><li> <div class="item-content"> <div class="item-inner"> <div class="item-title" data-i18n="package.version">Version</div><div class="item-after">' + userRepo.repository.packages[index].version + '</div></div></div></li><li> <div class="item-content"> <div class="item-inner"> <div class="item-title" data-i18n="package.version">Downloads</div><div class="item-after">' + userRepo.repository.packages[index].views + '</div></div></div></li><li> <a href="' + userRepo.repository.packages[index].info + '" class="item-link external"> <div class="item-content"> <div class="item-inner"> <div class="item-title" data-i18n="package.info">More Info</div></div></div></a> </li></ul> </div>';
				userPackage += '<div class="content-block-title">Repository Details</div><div class="list-block"><ul><li><div class=item-content><div class=item-inner><div class=item-title data-i18n=package.version>Name</div><div class=item-after>' + repoName + '</div></div></div></li><li><div class=item-content><div class=item-inner><div class=item-title data-i18n=package.version>Maintainer</div><div class=item-after>' + userRepo.repository.maintainer + '</div></div></div></li>';
				if (userRepo.repository.manager === 'true') {
					userPackage += '<li><div class=item-content><div class=item-inner><div class=item-title data-i18n=package.version>Sponsor</div><div class=item-after>Mojo Manager</div></div></div></li>';
				}
				if (userRepo.repository.wrapmojo === 'true') {
					userPackage += '<li><div class=item-content><div class=item-inner><div class=item-title data-i18n=package.version>Sponsor</div><div class=item-after>WrapMojo</div></div></div></li>';
				}
				userPackage += '</ul></div><div class="list-block inset-tablet"><ul style="background-color:#EFEFF4;"><li style="background-color:#8868ef;color:#ffffff;"><a onclick="addHistory(\'' + userRepo.repository.packages[index].id + '\');" href="' + userRepo.repository.packages[index].link + '" class="item-link list-button external" style="color:#fff;">Install</a></li>';
				userPackage += '<br /><li style="background-color:#8868ef;color:#ffffff;"><a onclick="displayLink(\'' + userRepo.repository.packages[index].link + '\');" class="item-link list-button" style="color:#fff;">Copy Install Link</a></li>';
				var tweetLink = 'https://twitter.com/intent/tweet?hashtags=GoMojo&original_referer=https%3A%2F%2Fabout.twitter.com%2Fresources%2Fbuttons&ref_src=twsrc%5Etfw&related=MojoInstaller&text=I%20just%20installed%20';
				tweetLink += userRepo.repository.packages[index].name + '%20thanks%20to%20Mojo!%20Check%20it%20out%20at%20https%3A%2F%2Fmojoinstaller.co%2F&tw_p=tweetbutton';
				var hiddenLink = '<a class="external share" href="' + tweetLink + '" style="display:none;"></a>';
				userPackage += hiddenLink;
				var shareCode = '<a href="#" onclick="sharePackage(\'' + userRepo.repository.packages[index].name + '\');"><img class="icon" src="data:image/png;base64,';
				shareCode += 'iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAABj0lEQVRoQ+2Z0VXDMAxF8QZ0EmCDdnLYgHYSukGQODInJ9h5qi3lh9eftFVs5UpPUpqWp+TXsizP6qKUcs90VTI3N4h383HJhEkDWUG8GshVjmkwKSANiJr4NJhwkA3ETQhejKK+T4EJBWlAnAXiy0BOcvw';
				shareCode += 'wsHCYMJAWhBa3fL9Y1yp2TgpMCEgPQgHWIPZZ23E4zDTIHkQLJAsmAuRTLk5brBbzeTsrthmp7WsrM1n3NjPTIkC0cPX1B6KXkQaMTv46b4Z4pkGQ115G0LpH7QTxRowZ8UbKzvsf0qqycATn2mufSFpir+0buhEf3cDvZuQBkFuvfTpAtH3XG8tdmGmQvQ1QGBEIWo9mUV';
				shareCode += '3vyghBJFzMyEpznmBQWp4i9RYq2osZWd1m//5MRVHr2T3RRHt79mCNoCgenVVmhBnxRoADsREpT9tDAZY9fp6yzDwl8VxHerEjUI+dIJEzwBNxdA4zwowgjQzaKS1Ka1A6aBmlRWkhjQzaKS1Ka1A6aFmYtJCjo+zTfyscdaHIzx7IN/tn1EJW0Zz9AAAAAElFTkSuQmCC" width="25" height="25"></a>';
				$$('#package-share').html(shareCode);
				packList = userPackage;
				console.log('[Mojo Installer] Loaded package!');
			}
		}
		$$(".inner-package").html(packList);
	});
}

function displayRepo(element, index, array) {
	$.getJSON(element, function(userRepo) {
		var veriCon = '';
		if (isVerified(element)) {
			veriCon = ' <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\">';
		}
		repoList += "<li class='swipeout'><a onclick=\"repoIcon=\'" + userRepo.repository.icon + "\'\" href=\"frames/viewrepo.php\" class=\"item\"><div class='swipeout-content'><div class='item-content'><div class='item-media'><img style='border-radius:100%;width: 58px;' src='" + userRepo.repository.icon + "'></div><div class='item-inner' style='padding-top: 5px;padding-bottom: 7px;margin-left: 0px;padding-left: 15px;'><div class='item-title-row' style=\"font-weight:500;\">" + "<div class=\"item-title\" style=\"color: #555; font-weight: 500 !important; height: 22px;\"><font size=\"3\">" + userRepo.repository.maintainer + "</font></div>" + veriCon + "</div><div class='item-subtitle' style='color: #EB4134;height: 19px; padding-bottom: 0px;'><font size=\"2\" style=\"font-weight:700!important;\">" + userRepo.repository.description + "</font></div><div class='item-subtitle' style='color: #888;height: 19px; padding-bottom: 0px;'><font size=\"1\">" + element + "</font></div></div></div></div></a><div class='swipeout-actions-right'><a href='#' class='bg-red' onclick=\"deleteRepository('" + element + "');\" data-i18n=\"repos.delete\"><img class=\"icon\" src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAABnUlEQVRoQ+1a203DQBDMVQAdECoI6YQS6IASSCoIJdARoYOkAujAzKJEgGV7Z3Vr2bLG0v341nsz+zzbV1YLucpCeKxSiTRNc4BhHjHWjoFOmH8rpeyzDJlGBCReAeo5CGwPMrvgM53imUQ+scItxhbgjkPgQPoB8+8YJ8jez41IY4AAjDIOyITkPbLUop4Sm48Ci8p7GAaJYDFzv4XBHK4jnL3tA+IRsVjfzIEFMHyASK9RqdDKDgPWMJF1RYS1ao2cPNJnvYhlajzQfjayblqOXEq1NcR/JTJ6/y+ZqYh0duo+MAxIRuZKPNMjIpKRm/IIW2GUI8EdtUJLoXWxANMjGBn1kWjNV9VS1RrYfzNJFw2hGp1dUNVH1EfUR4ZfopUjyhHliHLk1wI1XTja8fVdi/nESXrk579h+x8Gng3dn9wjjEGiMowB098QoyAZeRGJvsYyVq2RGcMjXwB0g+EeBqgB3kr066GCMwrI2tPLbhp3UPTiKRtpnjrmQRExgHCzkXnCuBsJcFvtGTfs4I2t6140EVfTxAKLIfINnUeoUdtQT7oAAAAASUVORK5CYII=\" width=\"30\" height=\"30\"></a></div></li>";
		$$(".inner-repos").html(repoList);
	});
}

function displaySource(element, index, array) {
	$.getJSON(element, function(userRepo) {
		for (index = 0; index < userRepo.repository.packages.length; ++index) {
			if (userRepo.repository.icon === repoIcon) {
				var newDesc = userRepo.repository.packages[index].description.toString().replace(/<br>/g, "");
				userRepo.repository.packages[index].description = newDesc;
				catList += "<li height='110'><a onclick=\'packageId=\"" + userRepo.repository.packages[index].id + "\"\' href='frames/viewpackage.php'><div class='item-content'>" + '<div class="item-media" style="z-index:0;"><img style="border-radius:21%;width:58px;" src="' + userRepo.repository.packages[index].icon + '" class="package-icon" alt="folder" /></div>' + '<div class="item-inner" style=""><div class="item-title" style="color:#555;"><span style="font-weight:500;">' + userRepo.repository.packages[index].name + ' (' + userRepo.repository.packages[index].version + ')</span><br />' + '<div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;"><span style="color:#eb4134;font-weight:700;">' + userRepo.repository.name + '</span><br /><span style="font-weight:400;z-index:1;padding-left:0px;">' + userRepo.repository.packages[index].author + '</span></div></div></div></div></a></li>';
				$$("#repo-name").html(userRepo.repository.name);
			}
		}
		$$(".inner-source").html(catList);
	});
}

function displayWatchlist(element, index, array) {
	$.getJSON(element, function(userRepo) {
		var userPkgs = JSON.parse(localStorage.getItem("mojowatchlist"));
		if (userPkgs === null) {
			$$(".inner-watchlist").html("");
			return;
		}
		for (var j = 0; j < userPkgs.length; ++j) {
			for (index = 0; index < userRepo.repository.packages.length; ++index) {
				if (userRepo.repository.packages[index].id == userPkgs[j]) {
					var newDesc = userRepo.repository.packages[index].description.toString().replace(/<br>/g, "");
					watchList += "<li height='110' class='swipeout'><a onclick=\'packageId=\"" + userRepo.repository.packages[index].id + "\"\' href='frames/viewpackage.php'><div class='swipeout-content'><div class='item-content'>" + '<div class="item-media"><img style="border-radius:21%;width:58px;" src="' + userRepo.repository.packages[index].icon + '" class="package-icon" alt="folder" /></div>' + '<div class="item-inner" style=""><div class="item-title" style="color:#555;"><span style="font-weight:500;">' + userRepo.repository.packages[index].name + ' (' + userRepo.repository.packages[index].version + ')';
					if (userRepo.repository.packages[index].signed === 'true') {
						histList += " <img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAYAAADFeBvrAAADS0lEQVRoQ92aXXLaMBDHtQWeQ2cCr6UnqFPoc+QTtD1B6A24QekNuEHhBukJUJ4LDT1B6StkJuQ5kO3KjsNHbVjZkgfjGWbIIK32p7+83l0HxIldcGI8wjnQvfSqj6J0pTeuIlaD12qycLmJzoHmsjWkbZMBBApVUyO/sEAEIwlmuAWAwico5QrKqUJb6kQEjlVyBhSrzhrKmUougdb3zu75cqiSE6C96jhWyRVQsjqO7yXrQCx1HKrkAuiwOg5VsgpkpI4jlWwD8dVxpJI1oFTqOFDJJpC5Og5UsgJ0J5tXCNDPkp8BYvtcjQdZbOi5bKC5/+ESBFYRhYcCGyCgQemzJwCqWZ3YTl6RyguY0BpTWmMKIOg7LGrDnzecdbaAZtLzACpnAlGn+9pRz4nTHM9ixiCGkPTThD4L2kyF+PhQVxP9d3AFQAGIKNE9YHm3UzpuPA1xgWLla7AAaC6b1wTz0djQMU1A/FFT40/PCjX7ABCUyUW96DgO6mrcDoCCuh9Kis7nuyICUQD5XcGV1P2Kl6BQVKhNmJegEKlSNKhdmP+AinT84mBigYoAlQSTCHTMUPtg9gIdI9QhmINAxwTFgWEBHQUUZQFlsWpz+uLsbDvM+fLPKKIMgPvANwLKPe97zs+4MOwjt2kw10Q2D6CZbN1S0UV1kvuLislJXY0uTFYyP3J+C00WyDq2NhwZ+Wg0OKxoy7dZnTSZj7i82KxID801ArqT79sIr74fMmrzd2qefKbmyTXXphEQ9d66VLR/5Rq3Mg7FN3rj1+XaMgPyW4oMX3KNWxlnGOmMgOjB+odK9YYVR5lGdKeHSuu3zOH8vlzwUM05wkUQJpGOrVCm3rUQUZMw3XE1eHPOBkoT4XSGDAid6DW+3hQE7Jk2YwCfvpyrX33OsWMDmUU4/EvhtpvkRLg5QJEL3nCcpH/YYEc6PhArwu0H2XXeAOyG7iPJgecDyeZ9cqsYHwRCz+R5selcqD52SLGzOKdNIh0fKDbChSBlsexxiq99O6xbaEtR7iSBcSMdG2jmN6kRvtFZpXNtA2QXcg22zkh0cKkPx6wMnw2kF1qJUle/qyGQPiky5ZzptGNovQYp1tbzTTaODZTWsbznnRzQP9wPxEQ5QJ/sAAAAAElFTkSuQmCC\" width=\"18\" height=\"18\">";
					}
					watchList += '</span><br />' + '<div class="item-desc" style="float:left;display:block;font-size:13px;color:#666;font-weight:400;"><span style="font-weight:700;color:#eb4134;">' + userRepo.repository.name + '</span><br />' + userRepo.repository.packages[index].author + '</div></div></div></div></div></a><div class="swipeout-actions-right"><a href="#" class="bg-red swipeout-close" onclick="deleteWatchlist(\'' + userPkgs[j] + '\');" data-i18n=\"history.delete\"><img class="icon icon-only" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFRklEQVRoQ+2Zi3ETSRCGUQR3RHByBIcjQERwJgLkCDARIEdwEAEiAiAC5AjORHBLBJgIzP9NdS+9s4/ZsZfijtJUTWlX29Pdf79XWj34RdbqF8Hx4Ajkv+bJo0f+9x65vb3dCMRzbT5ZB+3Xq9WKz+q1FL+q0JLQC2n694i2LwTmlT8T7VrXL7XP7Lv3+rwUTRNodkYzxLLDr2Sh2UCkGAq9M4Yv9Lm3a8ChMOsJnjEQ/+j+90yBG92fiObGPPFxDr8SCJ7XAMGif5lVsWS7pJRb9oOUPNM9IJ9pv9UGKAtvpe9EsxXNbH6LAcmsN4ev0zzE+tyIB975UnNYtJx9Oif/ih6RAuSEW7VKDynQ4S9et1UMvhO/EivCeXRNAsmS+1Jc9jFZh7gG730S7aNIo2fXuv9TO+XSlGKWZ1vReP5NJn8JCKFASJxL8H6ONQOQK53ZZEBQ/vEcIH4uGLMtFEN6jAIRA6zxRrtn2YIlvUSnpM6AeILPNgzngydHz00BoTRi0VqhOwsHegbX7QrVrfesYBw36kE8n8z2iMXnv3agrTwzQ4syS+efAsIkMLuAZBWPPtTkugx6JFiuFx4lMDp7EM1gHkzlzwy+e9HQhwaNMAYEb6y1i9UlV+AHAiHMCfdGHjkpeiRY7bMOAKZqhV7RC4EQsjfi/bCKsYh1npD6Q5smSeFoV88jYbyoSkjn6EAkaMzbqSmOPZ8CF0pxGoVGgcxJqoIgPEhYfpWgfGBMR6c8VvJQVoQ6Hs9HiK2Y0Tt6iEtCTMmNPonjXjMMHjvouqopRtlh2Ox0+hwIozdjxbk2Aimj3KMgq7HNMyoa9+2SEB/17wTELE5lQt7aNvyRx3jz2vThdaKT9C0QMUFhgLBIpE4MRoXD9V7XWMYn3J3umY0QCK9tUKbRNfSn2p0+YyHNcAp9aaHbRpvQbatqBOKNLDLifQLhoG9MIEzYCP1NGxAwvA79p6QMz1MxsSqJhVHsq8k76JMuzgsY3+cynX/b5yIQHxAhutI+c0sPaWVhAHhethIY7Z3dc+ST9oV4oBRJjjLQM/2yPhg9OYWy3EPfDMkzHmvjgUxWO0gmICG2ua3q5qFcwxQlCFFAbHJDmHUPBoaYRzFA3FUm+p5Lzt6B+FQ6mqRjVjJD+Hkna2M3Pxcarj+6a4V0mdcCcroKtZn4XE+FU8HlWJicKTa70EuWknkCkJ1kU2mq3Dtg6bZYlLp2AFI1BU/IvAQIMUuD6s0vU+E0wNR7CI9GeWX5uJTMK4D4pJtavgkiPDpDWQlUNt4QZuRJ6i++jIYqRUFgpXedBWQ2AOkMcfl9CUCmaPyVBDA7KUpZpTJSMgljB9Hm0hIyAYLVSFK3jt8nD80FEjxCAnPO+0XOgtK8XlpmL0dCX0idtwKI50gq4eKz1Vm+2xiPgz7fU/PzvFxEpph4tUkVJKvzp/qOECmuoEzxx2fRXoghs9VSMlPVImYZ8AgpFCfh97pmCmXhFUpzM4bGepH/aF0MydC7lpJ56p3dFcf1T1E4A+MYBsulaBn6CKPZXVpnvDPfV2bqfw5kLSW8M/OzKO8jPuhtTUkKQg+IFOJFDJqqLm3FAS/D9z4yHxEtcfrdiKH/X4G1iPVSOBHneAIQDImz8sndG8Kar2plcqad6fI3RMDA0N8z9ro+aFOJ/N2AKQA6vMDkCghGfuiqlxWXe8sc+hVlLW122p7sU8rx4kXTa6oRhAOW/PeSOfXbL9XM+wDXeAnrEz5Yv/gXQy04A4Sn8fiQTArDYPiOAqlV4mfTH4H8bA/k8o8eOXrkB1ngG3WGUOPEdlrGAAAAAElFTkSuQmCC" width="25" height="25"></a></div></li>';
				}
			}
		}
		$$(".inner-watchlist").html(watchList);
	});
}

function forceUpdate() {
  try {
		appCache.swapCache();
	} catch (ex) {
		appCache.update();
	}
}

function generateCustomNavBar(hex) {
	var customCode = 'a.nav-btn{color:#fff!important;}.navbar, .subnavbar{color: #FFF !important;background-color: #' + hex + '!important;}';
	return customCode;
}

function handleCacheEvent(e) {
  switch (e.type){ 
    case "noupdate":
		  $$('p#update-status').html(unescape("Mojo Installer<br />Your software is up to date."));
      break;
    case "updateready":
      setTimeout(function() {
        mainView.loadPage('frames/update.html');
        update();
        myApp.closeNotification('.notification-item');
      }, 100);
      break;
    // case "downloading":
		  // $$('p#update-status').html(unescape("<img src='img/loading.gif' style='width:38px'/><br /><br />Mojo Installer<br />A software update is being downloaded.."));
    //   break;
    case "progress":
      if (!userAlerted) {
        userAlerted = true; 
        myApp.addNotification({
      		title: '',
      		subtitle: '',
      		closeIcon: false,
      		message: '<span style="margin-top:5px;vertical-align:center;">Downloading software update...</span>',
      		media: '<img src="img/spinner.svg" width="22"></img>'
      	});
      }
      break;
  }
}

appCache.addEventListener('downloading', handleCacheEvent, false);
appCache.addEventListener('noupdate', handleCacheEvent, false);
appCache.addEventListener('progress', handleCacheEvent, false);
appCache.addEventListener('updateready', handleCacheEvent, false);


function initAudio() { var self = this; var clickAudio = new Audio('../sounds/click.mp3'); self.clickAudio = clickAudio; }

function isDisallowed(url) {
	for (var i = 0; i < 10; ++i) {
		url = url.replace('https://', '');
		url = url.replace('http://', '');
		url = url.replace('www.', '');
		url = url.replace('/', '');
		url = url.replace('.', '');
	}
	switch (url.toLowerCase()) {
		case "mtweakskittyxyz":
			return true;
		default:
			return false;
	}
}

function isVerified(url) {
	for (var i = 0; i < 10; i++) {
		url = url.replace('https://', '');
		url = url.replace('http://', '');
		url = url.replace('www.', '');
		url = url.replace('/', '');
		url = url.replace('.', '');
	}
	switch (url.toLowerCase()) {
		case "kennethdevmrepopw":
			return true;
		case "mojomrepopw":
			return true;
		case "cschaeferusrepo":
			return true;
		case "aptthelittlebossorgrepofilesmojo":
			return true;
		case "mojoinstallercorepo":
			return true;
		default:
			return false;
	}
}

function populateRepos() {
	console.log('[Mojo Installer] Populating repo list..');
	if (localStorage.getItem("mojorepos") === null) {
		$$(".inner-repos").html("");
		return;
	}
	repoList = '';
	var userRepos = JSON.parse(localStorage.getItem("mojorepos"));
	userRepos.forEach(displayRepo);
}

function populateCategories() {
	console.log('[Mojo Installer] Populating public source list..');
	if (localStorage.getItem("mojorepos") === null) {
		$$(".inner-packages").html("");
		return;
	}
	catList = '';
	$$(".inner-packages").html(catList);
	var userRepos = JSON.parse(localStorage.getItem("mojorepos"));
	console.log('[Mojo Installer] Clearing package list..');
	localStorage.setItem("mojopackages", "");
	userRepos.forEach(displayCategory);
}

function populateSources() {
	console.log('[Mojo Installer] Populating specific public source..');
	if (localStorage.getItem("mojorepos") === null) {
		$$(".inner-source").html("");
		return;
	}
	catList = '';
	var userRepos = JSON.parse(localStorage.getItem("mojorepos"));
	userRepos.forEach(displaySource);
}

function populateHistory() {
	console.log('[Mojo Installer] Populating package history..');
	if (localStorage.getItem("mojorepos") === null) {
		$$(".inner-packages").html("");
		return;
	}
	histList = '';
	var userPkgs = JSON.parse(localStorage.getItem("mojorepos"));
	userPkgs.forEach(displayHistory);
}

function populateWatchlist() {
	console.log('[Mojo Installer] Populating user watchlist..');
	if (localStorage.getItem("mojowatchlist") === null) {
		$$(".inner-watchlist").html("");
		return;
	}
	watchList = '';
	var userPkgs = JSON.parse(localStorage.getItem("mojorepos"));
	userPkgs.forEach(displayWatchlist);
}

function populatePackages() {
	console.log('[Mojo Installer] Displaying package..');
	if (localStorage.getItem("mojorepos") === null) {
		$$(".inner-package").html("");
		return;
	}
	packList = '';
	var userRepos = JSON.parse(localStorage.getItem("mojorepos"));
	userRepos.forEach(displayPackage);
}

function purgeDuplicates(arr) {
	console.log('[Mojo Installer] Purging duplicate entries..');
	var obj = {};
	for (var i = 0; i < arr.length; i++) {
		obj[arr[i]] = true;
	}
	arr = [];
	for (var key in obj) {
		arr.push(key);
	}
	return arr;
}

function reloadSources() {
	fpAdInjected = false;
	bsAdInjected = false;
	ehAdInjected = false;
	myApp.getCurrentView().router.refreshPage();
  if (localStorage.getItem('mojorepos').length > 2) {
  	myApp.addNotification({
  		title: '',
  		subtitle: '',
  		closeIcon: false,
  		message: '<span style="margin-top:5px;vertical-align:center;">Fetching data...</span>',
  		media: '<img src="img/spinner.svg" width="22"></img>'
  	});
  }
	populateRepos();
	populateHistory();
	populateCategories();
	checkVersion();
	setTimeout(function() {
		myApp.closeNotification(".notification-item");
	}, 3000);
}

function setFirstRun() {
	if (localStorage.getItem("mojoreturning") === null) {
		mojoWelcome = myApp.welcomescreen(mojoSlides, {
			'pagination': false,
			'cancel': '',
			'open': false,
			'bgcolor': '#202125',
			'fontcolor': '#fff',
			'onClosed': function() {
				continueFirstRun();
			}
		});
		mojoWelcome.open();
	}
}

function sharePackage(package) {
  // if (ae) { if (package === 'Date Trick') { if (ac) { location.href="https://cschaefer.us/listen2pablo"; return; } } }
	myApp.modal({
		title: 'Post to Twitter?',
		text: '"Mojo Installer" is trying to open "Safari" to post a tweet.',
		buttons: [{
			text: 'Open',
			onClick: function() {
				$$('.share').trigger('click');
				$$('.share').click();
			}
		}, {
			text: '<strong>Cancel</strong>',
			onClick: function() {
				return;
			}
		}]
	});
}

function update() {
	var html = "<div> \
			<div class='content-block tablet-inset'> \
				<div class='content-block-inner'> \
					<img src='img/icon.png' style='width: 60px; height: 60px; border-radius: 21%; vertical-align: top; float: left;'> \
					<p style='margin: 0; margin-left: 8px;'> \
						<span style='font-weight: 500; font-size: 15px; margin-left: 8px'>Mojo Installer Update ({{version}})<br></span> \
						<span style='font-size: 13px; margin-left: 8px' data-i18n='main.by'>By: Mojo Dev Team<br></span> \
						<span style='font-size: 13px; margin-left: 8px'>Downloaded</span> \
					</p>\
					<p>{{description}}<br><br>For more information, visit:<br><a href='https://mojoinstaller.co' class='external' target='_blank' style='text-decoration: underline;color:#8868ef;'>https://mojoinstaller.co</a>{{instructions}}</p> \
				</div> \
			</div> \
			</div> \
				<div class='list-block tablet-inset'> \
				<ul> \
					<li class='center item-button'> \
						<a href='#' class='update-button'> \
							<div class='item-content'> \
								<div class='item-inner'> \
									<div class='item-title' style='width: 100%;color:#8868ef;' data-i18n='navbar.install'>Install Now</div> \
								</div> \
							</div> \
						</a> \
					</li> \
				</ul> \
			</div>";
	$.getJSON("update.json", function(data) {
		$('p#update-status').closest(".page-content").html(html.replace(/{{version}}/g, data.en.updates[0].version).replace(/{{description}}/g, data.en.updates[0].description).replace(/{{instructions}}/g, ""));
		$('span#content').html(data.en.updates[0].content);
		$('.update-button').on("click", function() {
			myApp.modal({
				title: "Software Update",
				text: unescape("New Mojo version will begin installing. The app will restart when installation is finished."),
				buttons: [{
					text: "Later",
					onClick: function() {
						myApp.closeModal();
					}
				}, {
					text: "Install",
					bold: true,
					onClick: function() {
						myApp.popup('.popup-update');
						setTimeout(function() {
							myApp.closeNotification(".notification-item");
							localStorage.setItem('mojoversion', data.en.updates[0].version);
							location.reload(true);
						}, 8000);
					}
				}]
			});
		});
	});
}

function youPushedItDidntYou() {
	localStorage.clear();
	forceUpdate();
	myApp.popup('.popup-reset');
	setTimeout(function() {
		location.reload(true);
	}, 2500);
}
