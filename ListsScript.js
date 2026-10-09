function id(el) {
	return document.getElementById(el);
} 
'use strict';
// GLOBAL VARIABLES	
var lists=[]; // array of list items
var notes=[]; // array of note items
var items=[];
var item=null;
var itemIndex;
var list={};
var currentDialog=null;
var depth=0;
var path=[];
var lastSave=null;
var months="JanFebMarAprMayJunJulAugSepOctNovDec";
var dragStart={};
var latest;
// solid session & authentication...
const auth=solidClientAuthentication;
const session=auth.getDefaultSession();
// DRAG TO CHANGE DEPTH
id('main').addEventListener('touchstart', function(event) {
    // console.log(event.changedTouches.length+" touches");
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    // console.log('start drag at '+dragStart.x+','+dragStart.y);
})
id('main').addEventListener('touchend', function(event) {
    var drag={};
    drag.x=dragStart.x-event.changedTouches[0].clientX;
    drag.y=dragStart.y-event.changedTouches[0].clientY;
    if(Math.abs(drag.y)>50) return; // ignore vertical drags
    if((drag.x<-50)&&(depth>0)) { // drag right to decrease depth...
        console.log('path: '+path);
        if(path[path.length-1]=='CHECK') {
            path.pop();
            populateList(); // ...or just return from 'check' view
            return;
        }
        path.pop();
        depth--;
        if(depth<1) {
        	list.path='';
        	id('heading').innerHTML='SolidLists';
        }
		else {
	    	list.path=path[0];
	    	var i=1;
	    	while(i<path.length) {
	        	list.path+='.'+path[i++];
	    	}
		}
        console.log('list.path: '+list.path+' depth: '+depth);
        id('buttonNew').style.display='block';
        loadList();
    }
})
// CLOSE DIALOG
id('curtain').addEventListener('click',function() {
	showDialog(currentDialog,false);
})
// SHOW/HIDE DIALOG
function showDialog(dialog,show) {
    console.log('show '+dialog+': '+show);
    if(currentDialog) id(currentDialog).style.display='none';
    if(show) {
        id(dialog).style.display='block';
        currentDialog=dialog;
        id('buttonNew').style.display='none';
        id('buttonFind').style.display='none';
        id('curtain').style.height='100%';
    }
    else {
        id(dialog).style.display='none';
        currentDialog=null;
        id('buttonNew').style.display='block';
        id('buttonFind').style.display=(path=='')?'block':'none';
        id('curtain').style.height='0';
    }
    console.log('current dialog: '+currentDialog);
}
// TAP ON HEADER
id('buttonSync').addEventListener('click',connect);
// ADD NEW ITEM
id('buttonNew').addEventListener('click', function(){
	item={};
	id('noteTitle').innerHTML='new note';
	id('noteField').value='';
	id('noteDownButton').style.display='none';
	id('noteUpButton').style.display='none';
	id('deleteNoteButton').style.display='none';
	id('noteSaveButton').style.display='none';
	id('noteAddButton').style.display='block';
	item.type=0;
    if(depth<2 && list.type>0) { // list above depth 2 - can add sub-list...
        showDialog('addDialog',true);
    }
    else showDialog('noteDialog',true); // ...otherwise has to be note
})
id('addListButton').addEventListener('click',function() {
	id('listDialogTitle').innerHTML='new list';
	id('listField').value='';
	id('checkAlpha').checked=false;
	id('checkBoxes').checked=false;
	id('deleteListButton').style.display='none';
	id('listSaveButton').style.display='none';
	id('listAddButton').style.display='block';
	item={};
    item.type=1;
    item.path=list.path;
	showDialog('listDialog',true);
})
id('addNoteButton').addEventListener('click',function() {
	showDialog('noteDialog',true);
})
// FIND ITEM
id('buttonFind').addEventListener('click', function() {
	id('findText').value='';
	showDialog('findDialog',true);
})
id('findText').addEventListener('change',function() {
	showDialog('findDialog',false);
	find();
})
function find() {
	var found=[];
	var findText=id('findText').value.toLowerCase();
	if(findText.length<1) return;
	console.log('FIND '+findText);
	for(var i in items) {
		if(items[i].text.toLowerCase().includes(findText)) found.push(i);
		else if(items[i].path) {
			if(items[i].path.toLowerCase().includes(findText)) found.push(i);
		}
	}
	if(found.length<1) return; // no matches found
	id("list").innerHTML=""; // clear list
	id('heading').innerHTML='found...';
	id('buttonFind').style.display='none';
	id('buttonNew').style.display='none';
	path.push('FOUND');
	depth++;
	var item={};
	for(i in found) { // list matches
		var n=found[i];
		item.path=items[n].path;
		item.text=items[n].text;
		if(item.text.length>30) item.text=item.text.substr(0,30)+'...';
		console.log('add item '+i+': path: '+item.path+' - '+item.text);
		listItem=document.createElement('li');
		listItem.index=i;
		var itemText=document.createElement('span');
	 	itemText.index=i;
        if(item.path) itemText.innerText=item.path+' - ';
        itemText.innerText+=item.text;
	 	listItem.appendChild(itemText);
	 	itemText.addEventListener('click',function(event) {
	 		console.log('show item '+this.index);
			itemIndex=found[this.index];
			item=items[itemIndex];
			console.log('note '+itemIndex+': '+item.text+'; type '+item.type+'; index: '+item.index);
			if(item.type>0) { // show list
				console.log('show list for '+item.text);
				list.path=item.path+'.'+item.text;
				path=list.path.split('.');
				loadList();
			}
			else { // show note
				id('noteTitle').innerHTML='note';
				console.log('note is '+item.text);
				id('noteField').value=item.text;
				id('noteUpButton').style.display='none';
				id('noteDownButton').style.display='none';
				id('deleteNoteButton').style.display='none';
				id('noteAddButton').style.display='none';
				id('noteSaveButton').style.display='block';
				showDialog('noteDialog',true);
			}
		})
		id('list').appendChild(listItem);
	}
}
// MOVE UP/DOWN
id('noteUpButton').addEventListener('click', function() {move(true);})
id('noteDownButton').addEventListener('click', function() {move(false);})
function move(up) { // move note up/down
	var nextItem;
	console.log('move note '+itemIndex+' index: '+item.index+'; up is '+up);
    if(up && item.index<1) return; // cannot move up if already first...
    if(!up && (notes.length-item.index<2)) return; // ...or down if already last
    if(up)  item.index--; // shift this item up...
    else item.index++; // ...or down
    items[itemIndex]=item;
    save(); // WAS saveData();
	console.log('note updated - index:'+item.index+' type:'+item.type+' path:'+item.path);
	showDialog('noteDialog',false);
	loadList();
}
// NOTE
id('noteAddButton').addEventListener('click',function() {
	item.text=id('noteField').value;
	item.path=list.path;
	item.type=list.type-1;
	if(list.type<4) {
		if(notes.length>0) {
			var highest=items[notes[notes.length-1]].index;
			console.log('highest index: '+highest);
			item.index=highest+1;
		}
		else item.index=0;
	}
	items.push(item);
	console.log("new note:"+item.text+"type:"+item.type+" path:"+item.path+' index:'+item.index+" added");
	showDialog('noteDialog',false);
	save(); // WAS saveData();
	loadList();
})
id('noteSaveButton').addEventListener('click',function() {
	item.text=id('noteField').value;
	console.log('save note '+itemIndex+': '+item.text);
	items[itemIndex]=item;
	console.log('note updated');
	loadList();
	showDialog('noteDialog',false);
})
id('deleteNoteButton').addEventListener('click',function() {
	items.splice(itemIndex,1);
	save(); // WAS saveData();
	console.log('note deleted');
	showDialog('noteDialog',false);
	loadList();
})
// LIST
id('listAddButton').addEventListener('click',function() {
	if(id('checkBoxes').checked) item.type|=2;
	if(id('checkAlpha').checked) item.type|=4;
	console.log('list type: '+item.type);
	item.text=id('listField').value;
	console.log('new list: '+item.text+' type '+item.type+' path '+item.path);
	items.push(item);
	showDialog('listDialog',false);
	save();
	loadList();
})
id('listSaveButton').addEventListener('click',function() {
	if(id('checkBoxes').checked) item.type|=2;
	if(id('checkAlpha').checked) item.type|=4;
	console.log('list type: '+item.type);
	item.text=id('listField').value;
	items[itemIndex]=item;
	showDialog('listDialog',false);
	populateList();
})
id('deleteListButton').addEventListener('click',function() {
	items.splice(itemIndex,1);
	path.pop();
	depth--;
	list.path='';
	console.log('list deleted');
	showDialog('listDialog',false);
	loadList();
})
function checkItem(n) {
    items[notes[n]].checked=!items[notes[n]].checked;
    console.log(items[notes[n]].text+" checked is "+items[notes[n]].checked);
    save();
}
// LOAD LIST ITEMS
function loadList() {
	console.log("load children of list.path "+list.path+" - depth: "+depth);
	if(list.path=='') {
	    list.type=1;
	    path=[];
	}
	else {
		console.log("get list for "+list.path);
	}
	lists=[];
	notes=[];
	for(var i=0;i<items.length;i++) {
		if(items[i].path==list.path) {
			if(items[i].type&1) lists.push(i); // add index of list item to lists[]...
			else notes.push(i); // ...or to notes[]
			console.log('list item '+i+': '+items[i].text);
		}
	}
	console.log("No more entries! "+lists.length+" lists; "+notes.length+' notes');
	populateList();
}
// POPULATE LIST
function populateList() {
    var listItem;
    id("list").innerHTML=""; // clear list
	console.log("populate list for path "+path+" with "+(lists.length+notes.length)+" items - depth: "+depth);
	console.log('list type is '+list.type);
	if(path.length<1) {
		id('heading').innerHTML='SolidLists';
		id('buttonFind').style.display='block';
	}
	else {
	    list.path=path[0];
	    var i=1;
	    while(i<path.length) {
	        list.path+='.'+path[i++];
	    }
	    console.log('list.path: '+list.path);
		id('heading').innerHTML=list.path;
		id('buttonFind').style.display='none';
	}
	// show lists first, sorted alphabetically
	lists.sort(function(a,b){ // always sort list items alphabetically...
		if(items[a].text.toUpperCase()<items[b].text.toUpperCase()) return -1;
		if(items[a].text.toUpperCase()>items[b].text.toUpperCase()) return 1;
		return 0;
	});
	console.log('lists sorted');
	// show notes below lists - sorted alphabetically?
	if(list.type&4) notes.sort(function(a,b){ // sort notes alphabetically...
		if(items[a].text.toUpperCase()<items[b].text.toUpperCase()) return -1;
		if(items[a].text.toUpperCase()>items[b].text.toUpperCase()) return 1;
		return 0;
	});
	else notes.sort(function(a,b){return items[a].index-items[b].index}); // ...or by .index
	for(var i in lists) { // list first...
		listItem=document.createElement('li');
		listItem.index=i;
		listItem.innerText=items[lists[i]].text;
		listItem.addEventListener('click',function() {
			itemIndex=lists[this.index];
			console.log('open list '+itemIndex);
			item=items[itemIndex];
	 		console.log('name: '+item.text);
			list.type=item.type;
			list.name=item.text;
			if(list.path.length<1) list.path=item.text;
			else list.path+='.'+item.text;
			console.log('open list '+list.name+' type:'+list.type+' path: '+list.path);
			depth++;
			path.push(list.name);
			loadList();
		});
		listItem.style.fontWeight='bold'; // lists are bold
		id('list').appendChild(listItem);
	}
	for(var i in notes) { // ...then notes
		console.log('note '+i+': '+notes[i]+'; index: '+items[notes[i]].index+' - '+items[notes[i]].text);
		notes[i].index=i;
		if((list.type&2)&&(items[notes[i]].checked)) continue; // don't show checked items
		listItem=document.createElement('li');
		listItem.index=i;
		if(list.type&2) {
			console.log('checkbox for '+items[notes[i]].text); // checkbox list
		    var itemBox=document.createElement('input');
	 	    itemBox.setAttribute('type','checkbox');
	 	    itemBox.index=i;
	 	    itemBox.checked=items[notes[i]].checked;
	 	    itemBox.addEventListener('change',function() {checkItem(this.index);}); // toggle item .checked property
	 		listItem.appendChild(itemBox);
		}
		var itemText=document.createElement('span');
	 	itemText.index=i;
        itemText.innerText=items[notes[i]].text;
	 	listItem.appendChild(itemText);
	 	itemText.addEventListener('click',function(event) {
			itemIndex=notes[this.index];
			item=items[itemIndex];
			console.log('note '+itemIndex+': '+item.text+'; type '+item.type+'; index: '+item.index);
			id('noteTitle').innerHTML='note';
			console.log('note is '+item.text);
			id('noteField').value=item.text;
			id('noteUpButton').style.display='block';
			id('noteDownButton').style.display='block';
			id('deleteNoteButton').style.display='block';
			id('noteAddButton').style.display='none';
			id('noteSaveButton').style.display='block';
			showDialog('noteDialog',true);
		})
		id('list').appendChild(listItem);
	}
}
// DATA
function load() {
	var data=localStorage.getItem('ListsData');
	if(!data) {
		message('no data - restore backup?');
		return;
	}
	items=JSON.parse(data);
	console.log(items.length+' items');
	list.path='';
	loadList();
}
function save() {
	var data=JSON.stringify(items);
	window.localStorage.setItem('ListsData',data);
	console.log(items.length+' items saved');
}
// SOLID CODE
function connect() {
	console.log('CONNECT - logging in');
	try {
		auth.login({
    		oidcIssuer:"https://privatedatapod.com",
    		redirectUrl:window.location.href,
    		clientName:"SolidLists"
    	});
	}
	catch(error) {console.error(error.message);}
}
auth.handleIncomingRedirect({restorePreviousSession:true}).then(function(){
	if(session.info.isLoggedIn) {
		console.log('logged in as '+session.info.webId);
		message('LOGGED IN',false);
    	sync();
	}
});
async function sync() {
	if(!session.info.isLoggedIn) {connect(); return;} // ensure connected
	latest=window.localStorage.getItem('latest');
	console.log('latest is '+latest);
	message('SYNC - DOWNLOAD?',true);
	var response=await session.fetch('https://elvinibbotson.privatedatapod.com/drive/SolidListsData.json',
	{ // ONLY RESTORE DATA FROM POD IF NEWER THAN CURRENT LOCAL DATA
		method: 'GET',
		headers: {'If-Modified-Since':latest}
	});
	console.log('response: '+response.ok);
	if(response.ok) {
		var body=await response.json();
		console.log('response - last modified: '+response.lastModified);
		items=body.items;
		message(items.length+' items downloaded',false);
		save();
	}
	else { // local data is newer - upload to pod
		message('no download - UPLOAD',false);
		upload();
	}
	/*
	latest=new Date().toString();
	window.localStorage.setItem('latest',latest);
	console.log('latest set to '+latest);
	*/
	load(); // ensure working with latest dataset
}
async function upload() {
	if(!session.info.isLoggedIn) {connect(); return;} // ensure connected
  	console.log("BACKUP");
	var fileName="drive/SolidListsData.json";
	console.log(items.length+" items - save");
	var data={'items': items};
	var json=JSON.stringify(data);
	try {
		response=await session.fetch('https://elvinibbotson.privatedatapod.com/'+fileName,{
			method:'PUT',
			headers:{'Content-Type':'application/json'},
			body:json
		});
		if(!response.ok) {
    		throw new Error(`Response status: ${response.status}`);
    	}
    	console.log('backup saved, status: '+response.status);
    	message(items.length+' items saved');
	}
	catch (error) {console.error(error.message);alert(error.message);}
}
// DISPLAY MESSAGE
function message(text) {
	id('message').innerText=text;
	showDialog('messageDialog',true);
}
// START-UP CODE
latest=window.localStorage.getItem('latest');
if(!latest) {
	latest=new Date(0).toString(); // default to 1970
	window.localStorage.setItem('latest',latest);
}
load();
// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('sw.js', {
		scope: '/Lists/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}