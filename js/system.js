"use strict";
/*
	Grundsetting mit laden/speichern der aktuellen Fensterposition und Größe (+Setting in Programmeinstellungen)
	
	alle Maße in mm
*/


const electron = require('electron');
const {remote} = electron;
const {dialog, BrowserWindow} = remote;
const fs = require('fs');


var electron_app=function(){
	var Programmeinstellungen={//als Einstellungen gespeichert
		windowsize:{x:0,y:0,width:0,height:0}
	};
	
	var appdata={
		userdokumente:"",
		userbilder:"",
		pathData:"",
		ProgrammOrdner:"SplineWriter",
		DateinameOptionen:"optionen.json"
	}
	
	var zielNode;
	var app = require('electron').remote; 
	var path = require('path');
	path.join(__dirname, 'templates');
	//console.log(__dirname,path);
	
	var hardwaresettings={
		"servoport":"P1", //M280 P1 S50 ;S0..200
		"servoUP":"S100",
		"servoDown":"S0",
		"spiegelY":false,
		"spiegelX":true,
		
		//Line-Optimirungen
		"abweichung":6,			//°Winkel
		"abstandmin":0.8,  		//mm
		"grobabweichung":80,	//°Winkel
		
		"lastdateiname":""
	}
	
	//--basic--
	var gE=function(id){if(id=="")return undefined; else return document.getElementById(id);}
	var cE=function(z,e,id,cn){
		var newNode=document.createElement(e);
		if(id!=undefined && id!="")newNode.id=id;
		if(cn!=undefined && cn!="")newNode.className=cn;
		if(z)z.appendChild(newNode);
		return newNode;
	}
	var istClass=function(htmlNode,Classe){
		if(htmlNode!=undefined && htmlNode.className){
			var i,aClass=htmlNode.className.split(' ');
			for(i=0;i<aClass.length;i++){
					if(aClass[i]==Classe)return true;
			}	
		}		
		return false;
	}
	var addClass=function(htmlNode,Classe){	
		var newClass;
		if(htmlNode!=undefined){
			newClass=htmlNode.className;
			if(newClass==undefined || newClass=="")newClass=Classe;
			else
			if(!istClass(htmlNode,Classe))newClass+=' '+Classe;			
			htmlNode.className=newClass;
		}			
	}

	var subClass=function(htmlNode,Classe){
		var aClass,i;
		if(htmlNode!=undefined && htmlNode.className!=undefined){
			aClass=htmlNode.className.split(" ");	
			var newClass="";
			for(i=0;i<aClass.length;i++){
				if(aClass[i]!=Classe){
					if(newClass!="")newClass+=" ";
					newClass+=aClass[i];
					}
			}
			htmlNode.className=newClass;
		}
	}
	var delClass=function(htmlNode){
		if(htmlNode!=undefined) htmlNode.className="";		
	}
	var getClasses=function(htmlNode){return htmlNode.className;}
	
	var streckenlaenge2D=function(p1,p2) {//[x,y][x,y]
		return Math.sqrt( Math.pow(p2[1]-p1[1],2)+Math.pow(p2[0]-p1[0],2));
	} 
	var getWinkel=function(p0,p1,p2 ,rkorr){//[x,y][x,y][x,y]
		//Winkel Strecke p0-p1 zu p1-p2 in Grad
		var re=0;
		var a=streckenlaenge2D(p1,p2);
		var b=streckenlaenge2D(p0,p2);
		var c=streckenlaenge2D(p0,p1);	
		if(a>0 && b>0 && c>0)
			re=Math.acos((a*a+c*c-b*b)/(2*a*c))* 180/Math.PI;
 
		if(rkorr)if(p1[0]<p2[0])re=re*-1;
 
		 if(isNaN(re)){
			 //console.log(">",a,b,c);
			 re=0;
		 }
 
		return re;
	}
	
	function getMouseP(e){
		return{
			x:document.all ? window.event.clientX : e.pageX,	//pageX
			y:document.all ? window.event.clientY : e.pageY
			};
	}
	function getPos(re,o){
		var r=o.getBoundingClientRect();
		re.x-=r.left;
		re.y-=r.top;
		return re;
	}
	function relMouse(e,o){
		return getPos(getMouseP(e),o);
	}
		
		
	//--electron--
	
	var getSettingsAtStart=function(){
		var r,optionen,property,
			win=remote.getCurrentWindow();
			
		if(fs.existsSync(appdata.pathData+appdata.DateinameOptionen)){
			r=fs.readFileSync(appdata.pathData+appdata.DateinameOptionen,'utf-8',"a");
			if(r!=""){
				optionen=JSON.parse(r);
				if(optionen.windowsize!=undefined){
					win.setPosition(optionen.windowsize.x,optionen.windowsize.y);
					if(optionen.windowsize.width>0 && optionen.windowsize.height>0)
						win.setSize(optionen.windowsize.width,optionen.windowsize.height);
				}
				//setings
				//gespeicherte Propertys anfügen/ersetzen
				for( property in optionen ) {
						Programmeinstellungen[property]=optionen[property];
				}
			}
		}
		else{
			console.log("keine Optionsdatei gefunden. "+appdata.pathData+appdata.DateinameOptionen);
		}
	}

	
	var saveSettings=function(){
		//asyncron
		fs.writeFile(
				appdata.pathData+appdata.DateinameOptionen, 
				JSON.stringify(Programmeinstellungen),
				'utf-8',
				statussaving
			);
	}	
	var statussaving=function(err){
		if(err){
			showDevTools(true);
			console.log("Fehler:",err);
		}
	}
	var isdevtool=false;
	var showDevTools=function(b){
		var win=remote.getCurrentWindow();
		if(b===true)				
			win.webContents.openDevTools();
			else
			win.webContents.closeDevTools();
		isdevtool=b;
		Programmeinstellungen.showDevTool=b;
	}
	
	//--basicsEvent--
	var EventResize=function(event){
		var win=remote.getCurrentWindow();
		var bereich=win.getBounds();// x: 279, y: 84, width: 1250, height: 640
		Programmeinstellungen.windowsize=bereich;
		saveSettings();
	}
	
	this.ini=function(zielid){
		//electron basisc ini
		var win=remote.getCurrentWindow();
		appdata.userdokumente=app.app.getPath('documents');// C:\Users\andreas\Documents 
		if(!fs.existsSync(appdata.userdokumente+"\\"+appdata.ProgrammOrdner)){			
			fs.mkdirSync(appdata.userdokumente+"\\"+appdata.ProgrammOrdner);		//create dir if not
		}
		appdata.pathData=appdata.userdokumente+"\\"+appdata.ProgrammOrdner+"\\";
		appdata.pathData=path.normalize(appdata.pathData);
		
		appdata.userbilder=app.app.getPath('pictures');
		
		getSettingsAtStart();//SetWindowSize
		

		win.on('move',EventResize);
		//http://electron.atom.io/docs/api/web-contents/
		window.addEventListener('resize',EventResize );
		
		//myProgramm
		zielNode=gE(zielid);
		zielNode.innerHTML="";		
		
		CreateProgramm();
		win.webContents.closeDevTools();
		if(Programmeinstellungen.showDevTool===true){
			showDevTools(true);
		}
	}
		
	//--Programm--
	var zeichenfeld;	
	var werkzeuge;
	
		
	var CreateProgramm=function(){
		//showDevTools(true);
		//zielNode.innerHTML="Hallo.";
		var node;
		zeichenfeld=new oZeichenfeld(zielNode);
		
		werkzeuge=new oWerkzeuge(zielNode);
		
	}
	
	var oWerkzeuge=function(ziel){
		var openclosebutt;
		var inpStaerke;
		var inpWidth;
		var inpHeight;
		var inpAnzahlStriche;
		var inpShowdots;
		var inpShowdrawing;
		
		this.get=function(sWert){
			if(sWert=="width")	return parseInt(inpWidth.getVal());
			if(sWert=="height")	return parseInt(inpHeight.getVal());
			if(sWert=="linewidth")	return parseFloat(inpStaerke.getVal());
			if(sWert=="showdots")return inpShowdots.getVal();
			if(sWert=="showdots")return inpShowdots.getVal();
			if(sWert=="showdraw")return inpShowdrawing.getVal();
		}
		this.set=function(id,wert){
			if(id=="AnzahlStriche")inpAnzahlStriche.setVal(parseFloat(wert));
			if(id=="width")	inpWidth.setVal(parseInt(wert));
			if(id=="height")inpHeight.setVal(parseInt(wert));
		}
		
		var wopenclose=function(e){
			if( istClass(zielNode,"werkzeugeoffen") )
				subClass(zielNode,"werkzeugeoffen");
			else
				addClass(zielNode,"werkzeugeoffen");
			
			if(zeichenfeld){zeichenfeld.resize()}
			
			e.preventDefault();//return false
		}
		
		var changeElemente=function(v){
			if(zeichenfeld)zeichenfeld.resize();
		}
		
		var clearDrawing=function(v){
			if(zeichenfeld)zeichenfeld.clear();
		}
		
		var buttmoveL=function(v){if(zeichenfeld)zeichenfeld.moveto("L");}
		var buttmoveR=function(v){if(zeichenfeld)zeichenfeld.moveto("R");}
		var buttmoveT=function(v){if(zeichenfeld)zeichenfeld.moveto("T");}
		var buttmoveD=function(v){if(zeichenfeld)zeichenfeld.moveto("D");}
		var buttscaleP=function(v){if(zeichenfeld)zeichenfeld.scale("+");}
		var buttscaleM=function(v){if(zeichenfeld)zeichenfeld.scale("-");}
		
		var changeVPTrans=function(v){
			if(zeichenfeld)zeichenfeld.setVorlageT(v);		
		}
		
		var loadvorlage=function(v){
			if(zeichenfeld)zeichenfeld.loadvorlage();
		}
		
		var delvorlage=function(v){
			if(zeichenfeld)zeichenfeld.delvorlage();
		}
		
		var deletelastStrich=function(v){
			if(zeichenfeld){
				zeichenfeld.dellaststroke();
				};
		}
		
		var importgcode=function(v){
			if(zeichenfeld){
				zeichenfeld.importgcode();
				};
		}
		
		var exportgcode=function(v){
			if(zeichenfeld){
				zeichenfeld.exportgcode();
				};
		}
		
		var create=function(){
			var div,inpbutt;
			var node=cE(zielNode,"div","werkzeuge");
			
			openclosebutt=cE(node,"a",undefined,"ocbutt");
			openclosebutt.innerHTML="";
			openclosebutt.href="#";
			openclosebutt.addEventListener('click',wopenclose);
			
			inpAnzahlStriche=new inputElement(getWort('anzlinien'),'text',node);
			inpAnzahlStriche.inaktiv(true);
			
			div=cE(node,"div",undefined,"linetop");
			
			inpbutt=new inputElement(getWort('loadvorlage'),'button',node);
			inpbutt.addEvL("change",loadvorlage);
			
			inpbutt=new inputElement(getWort('delvorlage'),'button',node);
			inpbutt.addEvL("change",delvorlage);
			
			
			div=cE(node,"div",undefined,"block");
			inpbutt=new inputElement(getWort('opacity'),'range',div);
			inpbutt.setMinMaxStp(0,1,0.05);
			inpbutt.setVal(1);
			inpbutt.addEvL("change",changeVPTrans);
			
			
			div=cE(node,"div",undefined,"linetop");
			
			inpbutt=new inputElement(getWort('clearZeichnung'),'button',node);
			inpbutt.addEvL("change",clearDrawing);
			
			inpbutt=new inputElement(getWort('dellaststroke'),'button',node);
			inpbutt.addEvL("change",deletelastStrich);
			
			div=cE(node,"div",undefined,"linetop");
			
			//Zeichnung: -> <- V /\
			//show Punkte
			inpShowdots=new inputElement(getWort('showdots'),'checkbox',node);
			inpShowdots.addEvL("change",changeElemente);
			
			inpShowdrawing=new inputElement(getWort('showdraw'),'checkbox',node);
			inpShowdrawing.addEvL("change",changeElemente);
			
			div=cE(node,"div",undefined,"block linetop");
			div.innerHTML=getWort("moveto")+":";
			inpbutt=new inputElement(getWort('moveleft'),'button',div);
			inpbutt.addEvL("change",buttmoveL);
			inpbutt=new inputElement(getWort('moveright'),'button',div);
			inpbutt.addEvL("change",buttmoveR);
			inpbutt=new inputElement(getWort('movetop'),'button',div);
			inpbutt.addEvL("change",buttmoveT);
			inpbutt=new inputElement(getWort('movedown'),'button',div);
			inpbutt.addEvL("change",buttmoveD);
			
			inpbutt=new inputElement(getWort('scalemore'),'button',div);
			inpbutt.addEvL("change",buttscaleP);
			inpbutt=new inputElement(getWort('scaleless'),'button',div);
			inpbutt.addEvL("change",buttscaleM);
			
			
			
			div=cE(node,"div",undefined,"linetop");
			
			inpStaerke=new inputElement(getWort('Struchstaerke'),'number',node,getWort('mm'));
			inpStaerke.setVal(0.5);
			inpStaerke.setMinMaxStp(0.1,10,0.05);
			inpStaerke.addEvL("change",changeElemente);
			
			div=cE(node,"div",undefined,"block linetop");
			div.innerHTML=getWort("Zeichenflaeche")+":";
			
			inpWidth=new inputElement(getWort('breite'),'number',div,getWort('mm'));
			inpWidth.setVal(130);
			inpWidth.setMinMaxStp(0,500);
			inpWidth.addEvL("change",changeElemente);
			
			inpHeight=new inputElement(getWort('hoehe'),'number',div,getWort('mm'));
			inpHeight.setVal(80);
			inpHeight.setMinMaxStp(0,500);
			inpHeight.addEvL("change",changeElemente);
			
			div=cE(node,"div",undefined,"linetop");
			
			inpbutt=new inputElement(getWort('loadgcode'),'button',node);
			inpbutt.addEvL("change",importgcode);
			
			inpbutt=new inputElement(getWort('exportgcode'),'button',node);
			inpbutt.addEvL("change",exportgcode);
			
			
			
			addClass(zielNode,"werkzeugeoffen");
		}
		
		create();
	}
	
	var oZeichenfeld=function(ziel){
		var _this=this;
		var zeichnung=[];
		var strichepunkte=[];
		var basisnode;
		var canvasHG;
		var canvasVorlage;
		var canvasLines;
		var canvasZeichnung;
		var canvasDraw;
		var rand=10;//px
		var apptitel="";
		var korr=0.5;
		var stiftsize=1;//mm
		
		var farbeStift="#000000";
		var farbeZeichnung="#222222";
		var farbepunkte="#ff0000";
		
		var mausXY={x:0,y:0,px:0,py:0};//cm|pixel
		var mausstat={
			"isdown":false,
			"lastpos":{x:0,y:0,px:0,py:0},
			"isstart":false
		}
		
		this.resize=function(){
			resizeZF();
		}
				
		this.clear=function(){
			//Zeichnung löschen
			zeichnung=[];
			resizeZF();
		}
		
		this.dellaststroke=function(){
			var i,line,tempgrafik=[];
			if(zeichnung.length==0)return;
			for(i=0;i<zeichnung.length-1;i++){
				tempgrafik.push(zeichnung[i]);
			}
			zeichnung=tempgrafik;
			resizeZF();
		}
		
		this.loadvorlage=function(){
			dialog.showOpenDialog(
					{
						defaultPath :appdata.userbilder,//+"/"+daten.filename,
						properties: ['openFile'],
						filters: [
							{name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif']},
							{name: 'All Files', extensions: ['*']}
						  ]
					},
					function (filesNames) {
						   if (filesNames === undefined){
						   }
						   else{
							  console.log(filesNames);// An array
							  if(filesNames.length>0)
								loadVorlagenbild(filesNames[0]);
						   }
					}
				); 
		}
		this.delvorlage=function(){
			loadVorlagenbild("");
		}
		
		this.exportgcode=function(){
			var lz,pz,p,linie,xx,yy;
			//save ...
			//zeichnung
			
			var daten="; SplineWriter\n";
			
			
			var movespeed=1800;
			var drawspeed=900;
			var yMul=1;
			var xMul=1;
			var yVersatz=0;//mm
			var xVersatz=0;//mm
			
			var maxX=0;//mm
			var maxY=0;//mm
			for(lz=0;lz<zeichnung.length;lz++){
				linie=zeichnung[lz];
				for(pz=0;pz<linie.length;pz++){
						p=linie[pz];
						if(p.x>maxX)maxX=p.x;
						if(p.y>maxY)maxY=p.y;
				}
			}
			if(hardwaresettings.spiegelY){
				yMul=-1;
				//yVersatz=maxY*10;
				yVersatz=werkzeuge.get("height");
			}
			if(hardwaresettings.spiegelX){
				xMul=-1;
				//xVersatz=maxX*10;
				xVersatz=werkzeuge.get("width");
			}
			
			daten+="G21 ; set units to millimeters"+"\n";
			daten+="G90 ; use absolute coordinates"+"\n";
			daten+="\n";
			/* 
			G1 X71.874 Y58.418 F1800.000
			*/
			
			for(lz=0;lz<zeichnung.length;lz++){
				linie=zeichnung[lz];
				for(pz=0;pz<linie.length;pz++){
					p=linie[pz];
					
					xx=rundeauf(p.x*xMul+xVersatz,3);
					yy=rundeauf(p.y*yMul+yVersatz,3);
					
					if(pz==0){
						//moveTo
						daten+= "G1 X"+xx+" Y"+yy+" F"+movespeed +"\n";
						//+servo down
						daten+="; servo down" +"\n";
						daten+="M280 ";// M280 P1 S50 
						daten+=hardwaresettings.servoport+" ";
						daten+=hardwaresettings.servoDown+"\n";
					}
					else
					if(pz==1)
							daten+="G1 X"+xx+" Y"+yy+" F"+drawspeed  +"\n";
						else
							daten+="G1 X"+xx+" Y"+yy +"\n";
					
				}
				//+servo up
				daten+="; servo up"+"\n";
				daten+="M280 ";// M280 P1 S50 
				daten+=hardwaresettings.servoport+" ";
				daten+=hardwaresettings.servoUP+"\n";
			}
						
			daten+="M84     ; disable motors"+"\n";
			daten+="\n";
			
			
			savedaten(daten);
		}
		
		this.importgcode=function(){
				dialog.showOpenDialog(
					{
						defaultPath :appdata.userdokumente,//+"/"+daten.filename,
						properties: ['openFile'],
						filters: [
							{name: 'gcode', extensions: ['gcode']},
							{name: 'All Files', extensions: ['*']}
						  ]
					},
					function (filesNames) {
						   if (filesNames === undefined){
						   }
						   else{
							  console.log(filesNames);// An array
							  if(filesNames.length>0)
								loadGCode(filesNames[0]);
						   }
					}
				); 			
		}
		
		this.moveto=function(sRichtung){//L,R,T,D
			var i,line,pz,p;
			var stepx=0;
			var stepy=0;
			var weitemm=5;//mm
			if(sRichtung=="L")stepx=-1;
			if(sRichtung=="R")stepx=1;
			if(sRichtung=="T")stepy=-1;
			if(sRichtung=="D")stepy=1;
			
			for(i=0;i<zeichnung.length;i++){
				line=zeichnung[i];
				for(pz=0;pz<line.length;pz++){
					p=line[pz];
					p.x+=stepx*weitemm;
					p.y+=stepy*weitemm;
				}
			}
			resizeZF();
		}
		
		this.scale=function(pm){//"+","-"
			var i,line,pz,p;
			var stepx=0;
			var stepy=0;
			var scalefactor=1;
			
			if(pm=="+")scalefactor=1/90*100;//110%
			if(pm=="-")scalefactor=0.9;//90%
			
			for(i=0;i<zeichnung.length;i++){
				line=zeichnung[i];
				for(pz=0;pz<line.length;pz++){
					p=line[pz];
					p.x=p.x*scalefactor;
					p.y=p.y*scalefactor;
				}
			}
			resizeZF();
		}
		
		
		this.setVorlageT=function(v){
			canvasVorlage.style.opacity=v;
		}
		
		var mausmove=function(e){
			var xy=relMouse(e,canvasDraw);
		
			var b=werkzeuge.get("width");//mm
			var cb=canvasHG.width;
			
			var x=b/cb*xy.x;
			var y=b/cb*xy.y;
			mausXY={x:x,y:y ,px:xy.x,py:xy.y};
			
			document.title=apptitel+" ("+Math.floor(x*100)/100+"mm,"
							+Math.floor(y*100)/100+"mm) "
							/*+mausstat.isdown+' '
							+strichepunkte.length*/
							;
			
			if(mausstat.isdown){
				//zeichnen
				var cc=canvasDraw.getContext('2d');
				cc.strokeStyle=farbeStift;
				if(mausstat.isstart){
					setStiftsizetopixel(cc);
					mausstat.isstart=false;
				}
				cc.beginPath();
				cc.moveTo(mausstat.lastpos.px, mausstat.lastpos.py);
				cc.lineTo(mausXY.px, mausXY.py);
				cc.stroke();
				
				if(strichepunkte.length==0)
					strichepunkte.push(mausstat.lastpos);
				strichepunkte.push(mausXY);
			}
			
			mausstat.lastpos={x:x,y:y, px:xy.x,py:xy.y};
			
			e.preventDefault(); 
		}
		
		var mausdown=function(e){
			var cc=canvasDraw.getContext('2d');
			cc.clearRect(0, 0, canvasDraw.width, canvasDraw.height);
			strichepunkte=[];
			mausstat.isdown=true;
			mausstat.isstart=true;
			mausmove(e);
			
			e.preventDefault(); 
		}
		var mausup=function(e){
			if(mausstat.isdown)createLinie();
			mausstat.isdown=false;
			mausstat.isstart=false;
		}
		var mausout=function(e){
			if(mausstat.isdown)createLinie();
			mausstat.isdown=false;
		}
		
		var keydown=function(e){
			
			if(e.keyCode==90 && e.ctrlKey){
				_this.dellaststroke();
				e.preventDefault(); 
			}
			else
			if(e.keyCode==68 && e.ctrlKey){//strg+d
				showDevTools(!isdevtool);
				e.preventDefault(); 
			}
			else{
				console.log(e);
			}
			/*if(e.keyCode==32 && !mausstat.isdown){
				
				var cc=canvasDraw.getContext('2d');
				cc.clearRect(0, 0, canvasDraw.width, canvasDraw.height);
				strichepunkte=[];
				
				mausstat.isdown=true; 
			}*/
			
		}
		var keyup=function(e){
			/*if(e.keyCode==32){
				if(mausstat.isdown)createLinie();
				mausstat.isdown=false;
				}*/
			//e.preventDefault(); 
		}
		
		var resizeZF=function(e){
			if(werkzeuge!=undefined){				
				var b=werkzeuge.get("width");//mm
				var h=werkzeuge.get("height");//mm
				
				var bw=basisnode.offsetWidth -rand*2;
				var bh=basisnode.offsetHeight-rand*2;
				var canb=bw;
				var canh=bh;
				
				if(bw/b<bh/h){
					//breite=bw, höhe berechnen
					canh=canb/b*h;
					
				}else{
					//höhe=bh,breite berechen
					canb=canh/h*b;
				}
				
				canvasHG.width=canb;
				canvasHG.height=canh;
				
				canvasVorlage.width=canb;
				canvasVorlage.height=canh;
				
				canvasLines.width=canb;
				canvasLines.height=canh;
				
				canvasZeichnung.width=canb;
				canvasZeichnung.height=canh;
				
				canvasDraw.width=canb;
				canvasDraw.height=canh;
				
				showHGMuster();
				showZeichnung();
			}			
		}
		
		var showHGMuster=function(){//Raster 1cm
			var cc=canvasLines.getContext('2d');
			cc.clearRect(0, 0, canvasLines.width, canvasLines.height);
			var x,y;
			
			var b=werkzeuge.get("width");//mm
			var stepp=canvasLines.width/b*10;//je 1cm
			
			cc.strokeStyle="#badae9";
			
			for(x=0;x<canvasLines.width;x+=stepp){
				cc.beginPath();
				cc.moveTo(Math.floor(x)+korr,0);
				cc.lineTo(Math.floor(x)+korr,canvasLines.height);
				cc.stroke();
			}
			
			for(y=0;y<canvasLines.height;y+=stepp){
				cc.beginPath();
				cc.moveTo(0,Math.floor(y)+korr);
				cc.lineTo(canvasLines.width,Math.floor(y)+korr);
				cc.stroke();
			}
			
			werkzeuge.set("AnzahlStriche",zeichnung.length);
			
		}
		
		var loadVorlagenbild=function(fileName){
			fileName=fileName.split("\\").join("/");
			canvasVorlage.style.backgroundImage="url("+fileName+")";
		}
		
		
		
		var setStiftsizetopixel=function(cc){
			//stiftsize=mm
			stiftsize=werkzeuge.get("linewidth");//mm
			
			var b=werkzeuge.get("width");//mm
			var stepp=canvasHG.width/b;//pixel je 1mm
			
			//console.log("stift",stepp*stiftsize,stepp,stiftsize);
			
			cc.lineWidth=stepp*stiftsize;
			cc.lineCap="round";
			cc.lineJoin="round";
		}
	
		var vektorwinkel=function(p1,p2){
			
			var minx=Math.min(p1.x,p2.x);
			var miny=Math.min(p1.y,p2.y);
			var pp1={x:p1.x-minx,y:p1.y-miny};//auf 0/0 verschieben
			var pp2={x:p2.x-minx,y:p2.y-miny};
			
			var pp0={x:0,y:-5};
			
			/*
			var q=(pp2.y-pp1.y);
			if(q==0){
				q=1;
				//console.log((p2.x-p1.x),(p2.y-p1.y),"V",(p2.x-p1.x)/q,"*");
			}
			//else console.log((p2.x-p1.x),(p2.y-p1.y),"V",(p2.x-p1.x)/q);
			var vek=(pp2.x-pp1.x)/q;*/
			
			//Winkel Strecke p0-p1 zu p1-p2 in Grad
			var winkel=getWinkel([pp0.x,pp0.y],[pp1.x,pp1.y],[pp2.x,pp2.y],true);
			
			return winkel;
		}
		
		var Strichoptimieren=function(punkteliste){
			var i,p,pl,re=[],tmp=[],tmp2=[],abst,v,lastv,pwl,winkel,p2;	
			
			if(punkteliste.length<2)return punkteliste;
			
			var abweichung=hardwaresettings.abweichung;//°Winkel
			var abstandmin=hardwaresettings.abstandmin;  //cm ?
			var grobabweichung=hardwaresettings.grobabweichung;
						
			//mindestabstand + winkel
			tmp.push(punkteliste[0]);//ersten
			pl=punkteliste[0];
			lastv=0;
			for(i=1;i<punkteliste.length-1;i++){
				p=punkteliste[i];
				abst=streckenlaenge2D([pl.x,pl.y],[p.x,p.y]);//cm				
				
				pwl=punkteliste[i-1];
				p2=punkteliste[i+1];
				v=getWinkel([pl.x,pl.y],[p.x,p.y],[p2.x,p2.y],true);
				
				if(	abst>abstandmin &&   Math.abs(v-lastv)!=90
					/*(abst<=abstandmin && Math.abs(v-lastv)>grobabweichung &&  Math.abs(v-lastv)!=90) 
					*/
					){ //console.log(abst,'+',Math.abs(v));
					tmp.push(p);
					pl=punkteliste[i];
					lastv=v;
				}else{
					//console.log('-',Math.abs(v));
				}
			}
			tmp.push(punkteliste[punkteliste.length-1]);//letzten
			/*re=tmp;*/
			/*
			//mindestabstand
			tmp.push(punkteliste[0]);//ersten
			pl=punkteliste[0];
			for(i=1;i<punkteliste.length-1;i++){
				p=punkteliste[i];
				abst=streckenlaenge2D([pl.x,pl.y],[p.x,p.y]);//cm				
				if(abst>abstandmin){//console.log(abst);
					tmp.push(p);
					pl=punkteliste[i];
				}else{
					//console.log(abst,"-");
				}
			}
			tmp.push(punkteliste[punkteliste.length-1]);//letzten
			*/
	//tmp=punkteliste;
			
			//Vektorwinkel	
			re.push(tmp[0]);//den ersten mitnehmen
			lastv=0;
			for(i=1;i<tmp.length-1;i++){
				pl=tmp[i-1];
				p=tmp[i];
				
				v=vektorwinkel(pl,p);//console.log(v);
							
				if(Math.abs(v-lastv)>abweichung){
					re.push(p);
					//console.log(Math.abs(v-lastv),v);
					lastv=v;
				}
				//elseconsole.log(Math.abs(v-lastv),v,'-');
				
			}
			re.push(tmp[tmp.length-1]);//den letzten mitnehmen
			/**/
			
			abst=0;
			for(i=1;i<re.length;i++){
				pl=re[i-1];
				p=re[i];				
				abst+=streckenlaenge2D([pl.x,pl.y],[p.x,p.y]);
			}
			//console.log(re[0]);
			console.log("Optimiert von",punkteliste.length,tmp.length,"zu",re.length,"Länge:",abst);
			
			//if(abst==0)re=[]; //aktivieren, wenn man keine Punkte mag
				
			return re;
		}
				
		var createLinie=function(){
			//strichepunkte[] --> zeichnung + optimierung
			var cc=canvasDraw.getContext('2d');
			cc.clearRect(0, 0, canvasDraw.width, canvasDraw.height);
			
			if(strichepunkte.length<2)return;
			
			
			var AoptimierteLinie=Strichoptimieren(strichepunkte);
			if(AoptimierteLinie.length<2)return;
			
			cc=canvasZeichnung.getContext('2d');
			var i,p;
			var zline=[];
			//gezeichnete Linie in Zeichnung zeichnen
			cc.strokeStyle=farbeZeichnung;
			setStiftsizetopixel(cc);
			cc.beginPath();
			for(i=0;i<AoptimierteLinie.length;i++){
				p=AoptimierteLinie[i];
				if(i==0)
					cc.moveTo(p.px+korr,p.py+korr);
				else
					cc.lineTo(p.px+korr,p.py+korr);
				
				zline.push(AoptimierteLinie[i]);
			}
			cc.stroke();
			
			//punkte einzeichnen
			cc.fillStyle=farbepunkte;
			if(werkzeuge.get("showdots"))
			for(i=0;i<AoptimierteLinie.length;i++){
				p=AoptimierteLinie[i];
				cc.fillRect(p.px+korr-1,p.py+korr-1,3,3);
			}
			
			zeichnung.push(zline);
			werkzeuge.set("AnzahlStriche",zeichnung.length);
		}
		
		var timer=undefined;
		var showZeichnung=function(){
			if(timer!=undefined)clearTimeout(timer);
			var cc=canvasZeichnung.getContext('2d');
			cc.clearRect(0, 0, canvasZeichnung.width, canvasZeichnung.height);
			var iline,ip,line,p,xx,yy;
			
			var b=werkzeuge.get("width");//mm
			var cb=canvasHG.width;//Pixel
			
			var MulmmToPix=cb/b;
			var wait=0;
			
			cc.strokeStyle=farbeZeichnung;
			setStiftsizetopixel(cc);
			
			//console.log(">",zeichnung);
			var posline=0;
			
			var zeichnen=function(){
				var ip,p,xx,yy;
				if(zeichnung.length==0)return;
				
				if(timer!=undefined)clearTimeout(timer);
				
				cc.beginPath();
				
				line=zeichnung[posline];
				
				for(ip=0;ip<line.length;ip++){
					p=line[ip];
					//cm->pixel
					xx=(p.x*MulmmToPix);
					yy=(p.y*MulmmToPix);
					
					if(ip==0)
						cc.moveTo(xx+korr,yy+korr);
					else
						cc.lineTo(xx+korr,yy+korr);
				}
				cc.stroke();
				//punkte einzeichnen
				cc.fillStyle=farbepunkte;
				if(werkzeuge.get("showdots"))
				for(ip=0;ip<line.length;ip++){
					p=line[ip];
					xx=(p.x*MulmmToPix);
					yy=(p.y*MulmmToPix);
					cc.fillRect(xx+korr-1,yy+korr-1,3,3);
				}
				
				posline++;
				if(posline<zeichnung.length){
					if(wait>0)
						timer=setTimeout( function(){zeichnen()} ,wait);
					else
						zeichnen();
				}
			}
			
			if(werkzeuge.get("showdraw")){
				wait=20;//ms
			}
			zeichnen();
		}
		
		var create=function(){			
			apptitel=document.title;
			
			basisnode=cE(zielNode,"div","zeichenfeld");
			
			canvasHG=cE(basisnode,"canvas","canHG");
			canvasHG.style.left=rand+'px';
			canvasHG.style.top=rand+'px';
			
			canvasVorlage=cE(basisnode,"canvas","canVorlage");
			canvasVorlage.style.left=rand+'px';
			canvasVorlage.style.top=rand+'px';
			
			canvasLines=cE(basisnode,"canvas","canLines");
			canvasLines.style.left=rand+'px';
			canvasLines.style.top=rand+'px';
			
			canvasZeichnung=cE(basisnode,"canvas","canZeichnung");
			canvasZeichnung.style.left=rand+'px';
			canvasZeichnung.style.top=rand+'px';
			
			canvasDraw=cE(basisnode,"canvas","canDraw");
			canvasDraw.style.left=rand+'px';
			canvasDraw.style.top=rand+'px';
			
			
			canvasDraw.addEventListener('mousemove',mausmove,false );			
			canvasDraw.addEventListener('mousedown',mausdown );
			canvasDraw.addEventListener('mouseup',mausup );
			canvasDraw.addEventListener('mouseout',mausout );
			
			window.addEventListener('keydown',keydown );
			window.addEventListener('keyup',keyup );
			window.addEventListener('resize',resizeZF );
			
		}
		
		var rundeauf=function(val,stellen){
			var i,st=1;
			for(i=0;i<stellen;i++){
				st=st*10;
			}
			return Math.floor(val*st)/st;
		}
		var savedaten=function(daten){
				var dn=hardwaresettings.lastdateiname;
				if(dn=="")dn=appdata.userdokumente;
			console.log(dn,">",hardwaresettings.lastdateiname);
					dialog.showSaveDialog(
						{
							defaultPath :dn,//+"/"+daten.filename,
							properties: ['openDirectory'],
							filters: [
								{name: 'gcode', extensions: ['gcode']},
								{name: 'All Files', extensions: ['*']}
							  ]
						},
						function (fileName) {
							   if (fileName === undefined){
									//console.log("You didn't save the file");
									alert("Datei nicht gespeichert.");
							   }
							   else{
								   if(fileName.indexOf('.gcode')<0)fileName+='.gcode';
								   console.log("fileName",fileName);
								   fs.writeFileSync(fileName, daten,'utf8');
								   
								   alert("Datei "+fileName+" gespeichert.");
							   }
						}
					); 
			/**/			
		}
		
		var loadGCode=function(fileName){
			if(fileName=="")return;
			hardwaresettings.lastdateiname=fileName;
			
			var i,t,linie,s,bef,value,p,
				xx=0,
				yy=0,
				zz=0,
				staerke=0,//"S123"
				feedrate=0,
				ee;
			
			var factorToMM=1;//Quelle=mm
			
			var hatExtruder=false;
			var isLaser=false;		//oder Motor
			var isline=true;
			
			var yMul=1,xMul=1,yVersatz=0,xVersatz=0;
			if(hardwaresettings.spiegelY){
				yMul=-1;
				yVersatz=werkzeuge.get("height");
			}
			if(hardwaresettings.spiegelX){
				xMul=-1;
				xVersatz=werkzeuge.get("width");
			}
			
			zeichnung=[];//of Lines
			linie=[];
			
			var daten=fs.readFileSync(fileName, 'utf8');
			
			var dlist=daten.split('\n');
			for(i=0;i<dlist.length;i++){
				s=dlist[i].split(';')[0].toUpperCase().split(" ");
				//console.log(s);
				
				if(s[0]=="G90"){} //absolute Position
				
				if(s[0]=="G20")factorToMM=25.4; //inch to mm
				if(s[0]=="G21")factorToMM=1; 	//mm
				
				if(s[0]=="M280"){//Servo
					for(t=1;t<s.length;t++){
						if(s[t]==hardwaresettings.servoUP){//line fertig
							zeichnung.push(linie);
							isline=false;
						}
						if(s[t]==hardwaresettings.servoDown){//new Line
							linie=[];
							linie.push({x:xx,y:yy,px:0,py:0});//Ausgangspunkt
							isline=true;
						}
					}
				}
				
				if(s[0]=="G92"){//Set Position
					if(s[1]=="E0"){
						hatExtruder=true;
						if(linie.length>0)zeichnung.push(linie);
						linie=[];
					}
				}
				
				if(s[0]=="M3" || s[0]=="M4"){//Spindle On, Clockwise|Counter-Clockwise
					isLaser=true;
					isline=true;
					linie=[];
					linie.push({x:xx,y:yy,px:0,py:0});//add Point, aktuelle Position
				}
				if(s[0]=="M5"){//Spindle Off
					isLaser=true;
					isline=false;
					if(linie.length>1)zeichnung.push(linie);
					linie=[];
				}
				
				if(s[0]=="G1"){
					if(hatExtruder){isline=false;}
					for(t=1;t<s.length;t++){//Einzelwerte parsen
						bef=s[t];
						value=parseFloat(bef.slice(1));
						if(bef.indexOf('X')==0){xx=rundeauf(value*factorToMM*xMul+xVersatz,3);}//rundeauf drei Kommastellen
						if(bef.indexOf('Y')==0){yy=rundeauf(value*factorToMM*yMul+yVersatz,3);}
						if(bef.indexOf('Z')==0){zz=value*factorToMM;}
						
						if(bef.indexOf('S')==0){staerke=value;}//gbrl Stärke
						if(bef.indexOf('F')==0){feedrate=value;}//feedrate per minute
						
						if(bef.indexOf('E')==0){//extrude
							hatExtruder=true;
							value=bef.slice(1);
							if(value.indexOf(':')>-1)value=value.split(':')[0];
							
							if(value<=0){
								isline=false;
							}else{
								isline=true;
							}
						}
					}
					
					if(isLaser){
						if(staerke<1){
							isline=false;
						}
						else{
							isline=true;
						}
					}
					
					
					if(isline){
							linie.push({x:xx,y:yy,px:0,py:0});//add Point
						}
						else{
							if(hatExtruder){
								if(linie.length>0)zeichnung.push(linie);
								linie=[];
							}
							if(isLaser){
								if(linie.length>1)zeichnung.push(linie);
								linie=[];
								linie.push({x:xx,y:yy,px:0,py:0});//1. Point
							}
						}
				}
			}
			
			//Zeichnung checken, bei negativen Koordinaten, neu ausrichten
			var minX=0,maxX=0,minY=0,maxY=0;
			for(i=0;i<zeichnung.length;i++){//minXY holen - fals Zeichnung im negativen Bereich liegt
				for(t=0;t<zeichnung[i].length;t++){
					p=zeichnung[i][t];
					if(p.x<minX)minX=p.x;
					if(p.x>maxX)maxX=p.x;
					if(p.y<minY)minY=p.y;
					if(p.y>maxY)maxY=p.y;
				}
			}
			if(minX<0 || minY<0){
				//Zeichnung repositionieren, aus dem negativen Bereich in den positiven
				for(i=0;i<zeichnung.length;i++){
					for(t=0;t<zeichnung[i].length;t++){
						p=zeichnung[i][t];
						p.x+=(minX*-1);
						p.y+=(minY*-1);
					}
				}
			}
			minX=maxX;
			minY=maxY;
			for(i=0;i<zeichnung.length;i++){//min/max holen
				for(t=0;t<zeichnung[i].length;t++){
					p=zeichnung[i][t];
					if(p.x<minX)minX=p.x;
					if(p.x>maxX)maxX=p.x;
					if(p.y<minY)minY=p.y;
					if(p.y>maxY)maxY=p.y;
				}
			}
			
			if(maxX>werkzeuge.get("width")) {
				werkzeuge.set("width",Math.round(maxX+0.5));
			}//mm
			if(maxY>werkzeuge.get("height")){
				werkzeuge.set("height",Math.round(maxY+0.5));
			}//mm
			
			console.log(minX,maxX,minY,maxY);
			
			resizeZF();
			showZeichnung();
			
		}
		
		//------------		
		create();
	}
	
	var inpElementeNr=0;
	var inputElement=function(caption,typ,ziel,sEinheit){
		var input;
		var blockdiv;
		var vmin=undefined;
		var vmax=undefined;
		var sendetimer=undefined;
		var valsendenin=1000;//ms
		
		var fchange=undefined;
		
		this.setMinMaxStp=function(min,max,step){
			if(min!=undefined){
				input.min=min;
				vmin=parseFloat(min);
			}
			if(max!=undefined){input.max=max;vmax=parseFloat(max)};
			if(step!=undefined)input.step=step;
		}
		
		this.inaktiv=function(b){
			input.disabled =b;
		}
		
		this.setVal=function(val){
			if(input.type=="checkbox")
				input.checked=val;
				else
				input.value=val;
		}
				
		this.getVal=function(){
			if(input.type=="checkbox")
				return input.checked;
				else
				return input.value;
		}
		
		this.setClass=function(c){
			addClass(blockdiv,c);
		}
		
		this.addEvL=function(sEvent,func){
			if(sEvent=="change"){
				fchange=func;
			}
		}
		
		var inpchange=function(e){
			var senden=true;
			
			if(vmin!=undefined && input.value<vmin) senden=false;
			if(vmax!=undefined && input.value>vmax) senden=false;
			
			if(sendetimer!=undefined)clearTimeout(sendetimer);
			
			if(senden && fchange!=undefined)
				sendetimer=setTimeout(function(){fchange(input.value)},valsendenin);
		}
		
		var create=function(){
			blockdiv=cE(ziel,"div",undefined,"block");			
			var label,span;
			var iid='input_'+typ+'_'+inpElementeNr;
			
			if(typ!="button"){
				label=cE(blockdiv,"label");
				label.innerHTML=caption+':';
				addClass(label,"labeltext");
			}			
			
			input=cE(blockdiv,"input",iid);
			if(typ!="button"  ){
					//label.htmlFor=iid;
				}
			else
				input.value=caption;
			
			input.type=typ;
			if(typ=="button"){
				addClass(input,"button");
				input.addEventListener('click',inpchange);
				valsendenin=1;
			}else{
				input.addEventListener('change',inpchange);
				input.addEventListener('keyup',inpchange);
			}
			
			if(typ=="checkbox"){
				addClass(input,"booleanswitch");
				label=cE(blockdiv,"label");
				label.htmlFor=iid;
				valsendenin=100;
			}
			if(typ=="range"){
				valsendenin=10;
			}
			
			if(sEinheit!=undefined){
				span=cE(blockdiv,"span");
				span.innerHTML=sEinheit;				
			}
			
			inpElementeNr++;
		}
		
		create();
	}
	


}

//Start nach dem Laden
window.addEventListener('load', function (event) {
		var oProgramm_app;
		oProgramm_app=new electron_app();
		oProgramm_app.ini("myapplication");
	});
