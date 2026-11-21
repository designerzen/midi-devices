"""Generate original monochrome hardware drawings from device-specific layout data.

No downloaded artwork is embedded. Coordinates are simplified, not dimensioned CAD.
Run from any directory: python scripts/generate-diagrams.py
"""
import json
import math
import re
import textwrap
from html import escape
from pathlib import Path
from tactile import DEFS, SOURCE, symbol
from live_diagrams import render_device as render_live_device, render_connections as render_live_connections, VIRTUAL_HEIGHT

ROOT = Path(__file__).resolve().parent.parent
PROFILES = {json.loads(p.read_text(encoding="utf-8"))["id"]: p for p in (ROOT / "devices").glob("*/*/*.json")}
LAYOUTS = {}


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def normalise_label(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def number(value):
    return f"{value:.3f}".rstrip("0").rstrip(".")


class Drawing:
    def __init__(self, name, width, height, description):
        self.width=width;self.height=height;self.parts=[]
        self.parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title description">')
        self.parts.append(f'<title id="title">{escape(name)}</title><desc id="description">{escape(description)}</desc>')
        self.parts.append(f'<metadata>Symbol vocabulary: NYU ABILITY Project / IDM SynthAccess; {SOURCE}. Original schematic geometry; physical controls do not imply MIDI mappings.</metadata>')
        self.parts.append(DEFS)
        self.parts.append('<style>text{font-family:Arial,Helvetica,sans-serif;fill:#000;stroke:none}.line{fill:#fff;stroke:#000;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}.thin{fill:none;stroke:#000;stroke-width:1;stroke-linejoin:round;stroke-linecap:round}</style>')
        self.rect(0,0,width,height,fill="#fff",stroke="none")

    def rect(self,x,y,w,h,**attrs):
        attrs={"fill":"#fff","stroke":"#000","stroke_width":1.6,**attrs}
        args=" ".join(f'{k.replace("_","-")}="{escape(str(v))}"' for k,v in attrs.items())
        self.parts.append(f'<rect x="{number(x)}" y="{number(y)}" width="{number(w)}" height="{number(h)}" {args}/>')

    def line(self,x1,y1,x2,y2):
        self.parts.append(f'<path d="M{number(x1)} {number(y1)}L{number(x2)} {number(y2)}" fill="none" stroke="#000" stroke-width="1"/>')

    def circle(self,x,y,r,**attrs):
        attrs={"fill":"#fff","stroke":"#000","stroke-width":1.6,**attrs}
        args=" ".join(f'{k}="{v}"' for k,v in attrs.items())
        self.parts.append(f'<circle cx="{number(x)}" cy="{number(y)}" r="{number(r)}" {args}/>')

    def text(self,x,y,label,size=12,anchor="middle",width=None,bold=False):
        label=str(label)
        lines=textwrap.wrap(label,max(3,int(width/(size*.55)))) if width else [label]
        for i,line in enumerate(lines):
            self.parts.append(f'<text x="{number(x)}" y="{number(y+i*size*1.13)}" fill="#000" font-family="Arial,Helvetica,sans-serif" font-size="{size}" text-anchor="{anchor}"'+(' font-weight="bold"' if bold else '')+f'>{escape(line)}</text>')

    def save(self,path):
        path.write_text("\n".join(self.parts+["</svg>",""]),encoding="utf-8",newline="\n")


def draw_control(draw, kind, label, x, y, w, h, labelled, identifier, binding=None):
    draw.parts.append(f'<g id="{escape(identifier)}" data-kind="{kind}" aria-label="{escape(label)}"'+(f' data-control="{binding}"' if binding else '')+f'><title>{escape(label)}</title>')
    # Reserve the bottom part of each cell for labels; geometry is identical in both views.
    label_size=min(11,max(5,min(w*.14,(h-25)/2)))
    label_lines=textwrap.wrap(label,max(3,int((w-5)/(label_size*.55))))
    label_height=len(label_lines)*label_size*1.13+3
    gh=max(20,h-label_height-6);cx=x+w/2;cy=y+gh/2+3
    tactile_kind = "power" if label.lower() in ["power", "power on/off"] else kind
    tactile_kind = {"horizontal-strip": "horizontal-fader"}.get(tactile_kind, tactile_kind)
    glyph = symbol(tactile_kind, x+3, y+3, w-6, gh-2)
    if glyph:
        draw.parts.append(glyph)
    elif kind in ["knob","touch"]:
        r=min(w*.25,gh*.36,25);draw.circle(cx,cy,r);draw.line(cx,cy-r+3,cx,cy-r*.35)
        if kind=="touch":draw.circle(cx,cy,r*.8)
    elif kind in ["fader","strip","wheel"]:
        rw=min(14,w*.22) if kind!="strip" else min(22,w*.35)
        draw.rect(cx-rw/2,y+5,rw,max(8,gh-8),rx=rw/3)
        if kind!="strip":draw.rect(cx-rw,y+gh*.48,rw*2,7,fill="#000")
        else:draw.line(cx,y+10,cx,y+gh-7)
    elif kind=="horizontal-strip":
        draw.rect(x+5,cy-6,w-10,12,rx=5)
        draw.line(x+10,cy,x+w-10,cy)
    elif kind in ["joystick","xy"]:
        size=min(w*.75,gh*.85);draw.rect(cx-size/2,cy-size/2,size,size,rx=9)
        draw.line(cx-size*.3,cy,cx+size*.3,cy);draw.line(cx,cy-size*.3,cx,cy+size*.3)
        if kind=="joystick":draw.circle(cx,cy,size*.19);draw.circle(cx,cy,size*.32)
    elif kind=="jack":draw.circle(cx,cy,min(gh*.3,w*.18,14));draw.circle(cx,cy,min(gh*.14,w*.08,6))
    elif kind=="switch":
        draw.rect(cx-5,cy-12,10,24,rx=3);draw.rect(cx-9,cy-4,18,7)
    elif kind=="screen":
        draw.rect(x+5,y+5,w-10,gh-4,rx=3);draw.rect(x+9,y+9,w-18,max(3,gh-12),rx=1)
    elif kind=="matrix":
        for r in range(5):
            for c in range(7):draw.circle(x+10+(w-20)*c/6,y+10+(gh-20)*r/4,1.8)
    elif kind=="lightpad":
        draw.rect(x+8,y+6,w-16,gh-6,rx=18)
        for r in range(15):
            for c in range(15):
                draw.circle(x+20+(w-40)*c/14,y+18+(gh-30)*r/14,1.5)
    elif kind=="speaker":
        for r in range(6):draw.line(x+10,y+8+r*max(3,(gh-16)/6),x+w-10,y+8+r*max(3,(gh-16)/6))
    elif kind=="slot":draw.rect(x+8,cy-4,w-16,8)
    else:
        size=max(6,min(w-12,gh-4,30 if kind=="button" else 10000));draw.rect(cx-size/2,cy-size/2,size,size,rx=3 if kind!="key" else 1)
    if labelled:draw.text(cx,y+h-4-(len(label_lines)-1)*label_size*1.13,label,label_size,width=w-5)
    # Only label explicitly named waveforms; do not guess a selector's current value.
    waveform = next((glyph for word,glyph in [("sawtooth","wave-saw"),("saw","wave-saw"),("pulse","wave-pulse"),("triangle","wave-triangle"),("sine","wave-sine"),("square","wave-square")] if label.lower() in [word,word+" out"]),None)
    if waveform and w>40 and gh>30:draw.parts.append(symbol(waveform,x+4,y+4,20,20))
    draw.parts.append("</g>")


def keyboard(draw,spec,labelled):
    count,x,y,width,height=spec["keyboard"];style=spec["style"]
    prefix=spec.get("keyPrefix", "")
    first=spec.get("firstNote",48)
    notes=list(range(count));whites=[n for n in notes if (first+n)%12 not in [1,3,6,8,10]]
    ww=width/len(whites);positions={n:i for i,n in enumerate(whites)};elements=[]
    keyboard_label=spec.get("keyboardLabel", "Keyboard").rstrip(": ")
    draw.parts.append(f'<g id="{escape(prefix)}keyboard" aria-label="{escape(keyboard_label)}"><title>{escape(keyboard_label)}</title>')
    for black in [False,True]:
        for n in notes:
            is_black=(first+n)%12 in [1,3,6,8,10]
            if black!=is_black:continue
            xx=x+(sum(v<n for v in whites)-.31)*ww if black else x+positions[n]*ww
            w=ww*.62 if black else ww;hh=height*.61 if black else height
            label=spec.get("keyboardLabel", "")+("Keywave" if style=="keywave" else "Touch plate" if style in ["buchla","capacitive"] else "Key")+f" {n+1}"
            draw.parts.append(f'<g id="{escape(prefix)}key-{n+1}" data-kind="key" aria-label="{label}"><title>{label}</title>')
            draw.rect(xx,y,w,hh,fill="#000" if black and style not in ["keywave","buchla","capacitive"] else "#fff",rx=7 if style=="keywave" else 0)
            if style in ["keywave","capacitive","buchla"]:draw.line(xx+w/2,y+12,xx+w/2,y+hh-12)
            if labelled and not black:draw.text(xx+w/2,y+height-9,str(n+1),9)
            draw.parts.append("</g>")
            element={"id":f"{prefix}key-{n+1}","label":label,"kind":"key","position":{"x":xx/draw.width*100,"y":y/draw.height*100,"width":w/draw.width*100,"height":hh/draw.height*100}}
            if spec.get("mapKeyboard",True):
                element.update(message={"type":"note","number":first+n},learnable=True)
            element["dark"]=black
            elements.append(element)
    draw.parts.append("</g>")
    return elements


def render_device(identifier,spec,profile,folder):
    if "elements" in spec:
        return render_live_device(identifier,spec,profile,folder)
    elements=[];used=set();bindings=profile.get("controls",[])
    descriptions=spec.get("description", "Original simplified top-down line drawing; positions are illustrative, not mechanical dimensions. Labels identify physical controls, not guaranteed MIDI assignments.")
    for labelled,filename in [(False,"panel.svg"),(True,"interface.svg")]:
        draw=Drawing(profile["name"]+(" labelled interface" if labelled else " top panel"),spec["width"],spec["height"],descriptions)
        if spec.get("shell")=="handheld":
            w=spec["width"];h=spec["height"]
            draw.parts.append(f'<path d="M80 9H{w-80}Q{w-10} 9 {w-15} 90L{w-60} {h-70}Q{w-65} {h-9} {w-120} {h-9}H120Q65 {h-9} 60 {h-70}L15 90Q10 9 80 9Z" fill="#fff" stroke="#000" stroke-width="2"/>')
        else:
            draw.rect(9,9,spec["width"]-18,spec["height"]-18,rx=45 if spec.get("shell")=="arcana" else 12)
        draw.text(25,37,profile["name"],19,"start",bold=True)
        draw.text(spec["width"]-25,37,spec.get("viewLabel", "INTERFACE" if labelled else "TOP VIEW"),11,"end")
        used=set();current=[]
        for section in spec["groups"]:
            x,y,w,h=section["box"];labels=section["labels"];cols=section["columns"] or min(4,len(labels));rows=math.ceil(len(labels)/cols)
            draw.rect(x,y,w,h,rx=3)
            if labelled:draw.text(x+7,y+14,section["label"],9,"start",width=w-14,bold=True)
            cw=(w-12)/cols;ch=(h-35)/rows
            for i,value in enumerate(labels):
                label,sep,kind=value.partition("~");kind=kind.split("~")[-1] if sep else section["kind"]
                if kind=="jack":
                    # Direction comes from an explicit label or the documented port inventory.
                    match=next((p for p in spec["ports"] if normalise_label(p["label"])==normalise_label(label)),None)
                    if match and match["direction"] in ["input","output","bidirectional"]:kind=match["direction"]
                    elif re.search(r"\bOUT\b|\bphones\b",label,re.I):kind="output"
                    elif re.search(r"\bIN\b|^DC\b",label,re.I):kind="input"
                    elif "USB" in label:kind="bidirectional"
                key=slug(section["label"]+"-"+label);base=key;suffix=2
                while key in used:key=f"{base}-{suffix}";suffix+=1
                used.add(key)
                xx=x+6+(i%cols)*cw;yy=y+30+(i//cols)*ch
                item_w=cw;item_h=ch
                if section.get("positions"):
                    px,py,pw,ph=section["positions"][i]
                    xx=x+px*w;yy=y+30+py*(h-35);item_w=pw*w;item_h=ph*(h-35)
                binding=spec.get("bindings",{}).get(key)
                if not binding and spec.get("autoBind",True):
                    binding=next((c["id"] for c in bindings if c["id"]==key or slug(c["label"])==key or slug(c["label"])==slug(label)),None)
                draw_control(draw,kind,label,xx,yy,item_w,item_h,labelled,key,binding)
                e={"id":key,"label":section["label"]+": "+label,"kind":kind,"position":{"x":xx/spec["width"]*100,"y":yy/spec["height"]*100,"width":item_w/spec["width"]*100,"height":item_h/spec["height"]*100}}
                if binding:e["control"]=binding
                current.append(e)
        if "keyboard" in spec:current+=keyboard(draw,spec,labelled)
        for manual in spec.get("keyboards", []):
            current+=keyboard(draw,{**spec,**manual},labelled)
        draw.save(folder/filename)
        if labelled:elements=current
    return elements


def render_connections(spec,profile,folder):
    if "elements" in spec:
        return render_live_connections(spec,profile,folder)
    columns=[("INPUTS","input"),("OUTPUTS","output"),("DATA / POWER / CONTROLS","other")]
    groups=[]
    for _,direction in columns:
        groups.append([p for p in spec["ports"] if p["direction"]==direction] if direction!="other" else [p for p in spec["ports"] if p["direction"] not in ["input","output"]])
    maxrows=max(map(len,groups));ports_height=max(360,160+maxrows*62)
    inventory=[]
    for section in spec["groups"]:
        caption=section["label"]+": "+", ".join(s.split("~")[0] for s in section["labels"])
        inventory.extend(textwrap.wrap(caption,200))
    height=ports_height+80+len(inventory)*18
    draw=Drawing(profile["name"]+" connections",1500,height,"Connection inventory. Arrows indicate signal direction relative to the instrument. Locations identify hardware faces; the diagram is not a socket placement drawing. Physical control sections are listed below.")
    draw.text(30,37,profile["name"]+" / CONNECTIONS",20,"start",bold=True)
    draw.text(30,63,"Arrows are relative to the device. Locations name the hardware face; sockets are grouped by function.",12,"start")
    for c,((title,_),ports) in enumerate(zip(columns,groups)):
        x=25+c*495;draw.rect(x,90,470,ports_height-100,rx=6);draw.text(x+18,116,title,13,"start",bold=True)
        if not ports:draw.text(x+18,155,"No connections in this category",12,"start")
        for i,p in enumerate(ports):
            y=145+i*62;key=f"port-{c}-{i+1}";label=p["label"];draw.parts.append(f'<g id="{key}" aria-label="{escape(label)}" data-direction="{p["direction"]}"><title>{escape(label)}</title>')
            connector=p["connector"]
            draw.parts.append(symbol(p["direction"] if p["direction"] in ["input","output","bidirectional"] else "input",x+12,y-5,38,38))
            draw.text(x+62,y+11,label,13,"start",width=315,bold=True)
            draw.text(x+62,y+32,connector+" / "+p["location"],10,"start",width=365)
            direction_label="IN >" if p["direction"]=="input" else "> OUT" if p["direction"]=="output" else "< >" if p["direction"]=="bidirectional" else "CONTROL"
            draw.text(x+448,y+11,direction_label,8,"end");draw.parts.append("</g>")
    draw.text(25,ports_height+28,"PHYSICAL CONTROLS / see interface.svg for labelled positions",12,"start",bold=True)
    for i,line in enumerate(inventory):
        draw.text(25,ports_height+52+i*18,line,11,"start")
    draw.save(folder/"connections.svg")


def render_existing_surface(profile,folder):
    """Restyle partial profiles without inventing missing hardware layout data."""
    surface=profile["surface"];width=surface["width"];height=surface["height"]
    if not surface["elements"]:return
    for labelled,filename in [(False,"panel.svg"),(True,"interface.svg")]:
        draw=Drawing(profile["name"]+" schematic",width,height,"Partial conceptual surface. Existing virtual assignments and positions are preserved; consult the device documentation for physical hardware layout.")
        draw.text(20,35,profile["name"],20,"start")
        for item in surface["elements"]:
            p=item["position"];x=p["x"]*width/100;y=p["y"]*height/100;w=p["width"]*width/100;h=p["height"]*height/100
            if item["kind"]=="key":
                draw.parts.append(f'<g id="{escape(item["id"])}" data-kind="key" aria-label="{escape(item["label"])}"><title>{escape(item["label"])}</title>')
                draw.rect(x,y,w,h,fill="#000" if item.get("dark") else "#fff")
                draw.parts.append("</g>")
            else:
                draw_control(draw,item["kind"],item["label"],x,y,w,h,labelled,item["id"],item.get("control"))
        draw.save(folder/filename)


def main():
    LAYOUTS.update(json.loads((ROOT / "scripts" / "diagram-layouts.json").read_text(encoding="utf-8")))
    for identifier,path in PROFILES.items():
        profile=json.loads(path.read_text(encoding="utf-8"));folder=path.parent
        spec=LAYOUTS.get(identifier)
        if spec:
            elements=render_device(identifier,spec,profile,folder)
            live = "elements" in spec
            height = spec["height"] + (VIRTUAL_HEIGHT if live and spec.get("virtual") else 0)
            profile["surface"]={"src":"panel.svg" if live else "interface.svg","width":spec["width"],"height":height,"elements":elements}
        else:
            render_existing_surface(profile,folder)
            spec={"ports":profile.get("connections",[]),"groups":[],"references":profile.get("diagramSources",[])}
        if spec["ports"] or identifier in LAYOUTS:render_connections(spec,profile,folder)
        # Device icon URLs stay stable, but their artwork is the manufacturer's logo.
        logo=folder.parent/"logo.svg"
        if logo.exists():
            (folder/"icon.svg").write_bytes(logo.read_bytes())
        profile["diagrams"]={"panel":"panel.svg","connections":"connections.svg","interface":"interface.svg"}
        profile["connections"]=spec["ports"]
        profile["diagramSources"]=list(dict.fromkeys(spec["references"]+[SOURCE]))
        notice=profile.get("notice","")
        notice=re.sub(r" Panel art is a schematic, not a scale hardware diagram\.","",notice)
        notice=re.sub(r" Surface notes are virtual chromatic pads starting at note 48, not factory keyboard octave assignments\.","",notice)
        profile["notice"]=notice
        path.write_text(json.dumps(profile,indent="\t",ensure_ascii=False)+"\n",encoding="utf-8",newline="\n")
    print(f"Generated {len(PROFILES)*3} monochrome SVG diagrams for {len(PROFILES)} devices")


if __name__=="__main__":main()
