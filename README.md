![screenshot_1](https://github.com/polygontwist/splinewriter/blob/master/work/screenshot1.png)

# Wozu das ganze?

Ich brauchte ein Programm mit dem man Zeichnungen erstellen/konvertieren kann, um sie später auf einen Plotter auszugeben.

Die Zeichnungen können im gcode-Format oder als SVG gespeichert werden. Mann kann also gcode nach svg und umgekehrt konvertieren (gcodetosvg, svgtogcode).

Es können, neben gcode, auch SVG-Gafiken geladen werden. In den SVG-Grafiken müssen die Linien in "pfad"- oder "polyline"-Tags angelegt sein, andere Tags können nicht ausgewertet werden.

Für die Ausführung ist ein Gerät mit Marlin-Firmeware von Nöten, das ein Servo für den Stifthalter benutzt.
Ich benutze "Marlin 1.1.0-RC6" auf einem Rumba-Board (https://www.instagram.com/p/BZHirZBgRO-/ https://www.instagram.com/p/BY3j2lXDd58/).

![Beispiel](https://github.com/polygontwist/splinewriter/blob/master/exampel/tiger.jpg)

# Projekt updates
* v0.0.1: erste Version; 
* v0.0.2: neue Option: MoveTo Ymax; Einheiten für GEschwindigkeit; niedrigere Defaultwerte
* v0.0.3: Korrektur Einheiten
* v0.0.5: speichern optimiert; letzter Pfad wird gemerkt
* v0.0.6: Buffixes and SVG export; import SVG-polyline

# Projekt bearbeiten

Für die Bearbeitung diese Projektes benötigt man:<br>
https://nodejs.org dabei ist der npm-Packetmanager<br>
mit<br>
> npm install --global electron

wird electron global installiert.
mit<br>
> npm install electron-builder

kommt noch der builder zum packen des Projektes hinzu.

In der Eingabeaufforderung kann, im Verzeichnis des Projektes mit<br>
> electron .

das Programm gestartet werden (Entwicklungsversion).<br>
Mit<br>
> build

kann ein Packet zur Installation erzeugt werden.
Das kann dann wie jedes normale Programm von Nutzern installiert werden. 
Das Installationsprogramm ist dann im Verzeichnis `dist` zu finden.


