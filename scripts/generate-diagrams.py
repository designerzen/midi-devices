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

ROOT = Path(__file__).resolve().parent.parent
PROFILES = {json.loads(p.read_text(encoding="utf-8"))["id"]: p for p in (ROOT / "devices").glob("*/*/*.json")}
LAYOUTS = {}


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def number(value):
    return f"{value:.3f}".rstrip("0").rstrip(".")


def precise(value):
    return float(f"{value:.4f}")


# Outline-only artwork: colour comes from the host through currentColor.
OUTLINE='fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round"'
BUTTON_KINDS={"button","pad","key"}
NON_CONTROLS={"screen","jack","slot","speaker","matrix"}
ROLE_DESCRIPTIONS={"knob":"rotary control","fader":"slider","strip":"touch strip","wheel":"wheel","horizontal-strip":"touch strip","joystick":"joystick","xy":"touch pad","touch":"touch control","screen":"display","jack":"socket","switch":"switch"}


class Drawing:
    """An SVG whose IDs all start with the device and view, e.g. roland-tb-3-panel--cutoff."""
    def __init__(self,device,view,name,width,height,description):
        self.width=width;self.height=height;self.parts=[];self.prefix=f"{device}-{view}--"
        p=self.prefix
        self.parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="group" aria-labelledby="{p}title" aria-describedby="{p}description" data-device="{device}" data-diagram-style="wireframe" style="background: #fff; color: #000;">')
        self.parts.append(f'<title id="{p}title">{escape(name)}</title><desc id="{p}description">{escape(description)}</desc>')
        self.parts.append('<style>text{font-family:Arial,Helvetica,sans-serif}[data-part]:focus-visible{outline:3px solid currentColor}</style>')

    def rect(self,x,y,w,h,rx=0,heavy=False):
        self.parts.append(f'<rect x="{number(x)}" y="{number(y)}" width="{number(w)}" height="{number(h)}" rx="{number(rx)}" {OUTLINE} stroke-width="{3.2 if heavy else 1.6}"/>')

    def line(self,x1,y1,x2,y2):
        self.parts.append(f'<path d="M{number(x1)} {number(y1)}L{number(x2)} {number(y2)}" {OUTLINE} stroke-width="1"/>')

    def circle(self,x,y,r):
        self.parts.append(f'<circle cx="{number(x)}" cy="{number(y)}" r="{number(r)}" {OUTLINE} stroke-width="1.6"/>')

    def text(self,x,y,label,size=12,anchor="middle",width=None,bold=False):
        label=str(label)
        lines=textwrap.wrap(label,max(3,int(width/(size*.55)))) if width else [label]
        for i,line in enumerate(lines):
            self.parts.append(f'<text x="{number(x)}" y="{number(y+i*size*1.13)}" fill="currentColor" stroke="none" font-size="{size}" text-anchor="{anchor}"'+(' font-weight="bold"' if bold else '')+f'>{escape(line)}</text>')

    def region(self,element):
        """A transparent hit area matching one profile surface element."""
        box=element["position"]
        x,y,w,h=(box["x"]*self.width/100,box["y"]*self.height/100,box["width"]*self.width/100,box["height"]*self.height/100)
        self.parts.append(f'<g id="{self.prefix}surface--{escape(element["id"])}" data-surface-control="{escape(element["id"])}" aria-hidden="true"><rect x="{x:.10g}" y="{y:.10g}" width="{w:.10g}" height="{h:.10g}" stroke-opacity="0" pointer-events="all" {OUTLINE}/></g>')

    def save(self,path):
        path.write_text("\n".join(self.parts+["</svg>",""]),encoding="utf-8",newline="\n")


def element_kind(kind):
    return kind if kind in ["key","pad","button","knob","fader"] else "fader" if kind in ["strip","wheel","horizontal-strip"] else "button"


def part_elements(spec,key,label,kind,box,binding=None,message=None,dark=False):
    """Surface elements carried by one physical part.

    Layouts may list them under elements[key] to keep IDs, labels and MIDI messages stable
    across redraws: saved user mappings are keyed by element ID. An entry's "region" places
    it as [x, y, width, height] fractions of the part; otherwise several elements on one
    part (context-dependent controls) split its area so each stays reachable.
    """
    entries=spec.get("elements",{}).get(key)
    if entries is None:
        entries=[{"id":key,**({"control":binding} if binding and "elements" not in spec else {}),**({"message":message} if message else {})}]
    # Displays, sockets and the like are drawn but are not hit areas unless they carry MIDI.
    if kind in NON_CONTROLS:
        entries=[entry for entry in entries if entry.get("control") or entry.get("message")]
    x,y,w,h=box
    count=len(entries)
    boxes=[(x+w*i/count,y,w/count,h) for i in range(count)] if w>=h else [(x,y+h*i/count,w,h/count) for i in range(count)]
    boxes=[(x+e["region"][0]*w,y+e["region"][1]*h,e["region"][2]*w,e["region"][3]*h) if "region" in e else b for e,b in zip(entries,boxes)]
    elements=[]
    for entry,(bx,by,bw,bh) in zip(entries,boxes):
        position={"x":precise(bx)/spec["width"]*100,"y":precise(by)/spec["height"]*100,"width":precise(bw)/spec["width"]*100,"height":precise(bh)/spec["height"]*100}
        element={"id":entry["id"],"label":entry.get("label",label),"kind":entry.get("kind",element_kind(kind)),"position":position}
        for field in ["control","message"]:
            if entry.get(field):element[field]=entry[field]
        element["learnable"]=True
        if dark:element["dark"]=True
        elements.append(element)
    return elements


def open_part(draw,key,kind,label):
    role='role="button" aria-disabled="true" tabindex="-1"' if kind in BUTTON_KINDS else f'role="group" aria-roledescription="{ROLE_DESCRIPTIONS.get(kind,"control")}"'
    draw.parts.append(f'<g id="{draw.prefix}{escape(key)}" data-part="{escape(key)}" data-kind="{kind}" {role} aria-label="{escape(label)}"><title>{escape(label)}</title><g aria-hidden="true">')


def close_part(draw,elements,regions):
    draw.parts.append("</g>")
    if regions:
        for element in elements:draw.region(element)
    draw.parts.append("</g>")


def draw_control(draw, kind, label, x, y, w, h, labelled):
    # Reserve the bottom part of each cell for labels; geometry is identical in both views.
    label_size=min(11,max(7,w*.14))
    label_lines=textwrap.wrap(label,max(3,int((w-5)/(label_size*.55))))
    label_height=len(label_lines)*label_size*1.13+3
    gh=max(8,h-label_height-8);cx=x+w/2;cy=y+gh/2+3
    if kind in ["knob","touch"]:
        r=min(w*.25,gh*.36,25);draw.circle(cx,cy,r);draw.line(cx,cy-r+3,cx,cy-r*.35)
        if kind=="touch":draw.circle(cx,cy,r*.8)
    elif kind in ["fader","strip","wheel"]:
        rw=min(14,w*.22) if kind!="strip" else min(22,w*.35)
        draw.rect(cx-rw/2,y+5,rw,max(8,gh-8),rx=rw/3)
        if kind!="strip":draw.rect(cx-rw,y+gh*.48,rw*2,7,heavy=True)
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


def keyboard(draw,spec,labelled,regions):
    count,x,y,width,height=spec["keyboard"];style=spec["style"]
    notes=list(range(count));whites=[n for n in notes if n%12 not in [1,3,6,8,10]]
    ww=width/len(whites);positions={n:i for i,n in enumerate(whites)};elements=[]
    draw.parts.append(f'<g id="{draw.prefix}keyboard" data-region="keyboard" aria-label="Keyboard">')
    for black in [False,True]:
        for n in notes:
            is_black=n%12 in [1,3,6,8,10]
            if black!=is_black:continue
            xx=x+(sum(v<n for v in whites)-.31)*ww if black else x+positions[n]*ww
            w=ww*.62 if black else ww;hh=height*.61 if black else height
            label=("Keywave" if style=="keywave" else "Touch plate" if style in ["buchla","capacitive"] else "Key")+f" {n+1}"
            key=f"key-{n+1}"
            items=part_elements(spec,key,label,"key",(xx,y,w,hh),message={"type":"note","number":48+n},dark=black)
            open_part(draw,key,"key",label)
            # Dark keys are drawn with a heavier outline instead of a fill.
            draw.rect(xx,y,w,hh,rx=7 if style=="keywave" else 0,heavy=black and style not in ["keywave","buchla","capacitive"])
            if style in ["keywave","capacitive","buchla"]:draw.line(xx+w/2,y+12,xx+w/2,y+hh-12)
            if labelled and not black:draw.text(xx+w/2,y+height-9,str(n+1),9)
            close_part(draw,items,regions)
            elements+=items
    draw.parts.append("</g>")
    return elements


VIRTUAL_HEIGHT=90


def virtual_strip(draw,spec,labelled,regions,top):
    """MIDI-only controls, such as a sustain pedal input or aftertouch, below the panel."""
    entries=spec["virtual"];x=25;w=spec["width"]-50;cw=w/len(entries)
    draw.parts.append(f'<g id="{draw.prefix}midi-only" data-region="midi-only" aria-label="MIDI-only controls">')
    draw.rect(x,top,w,VIRTUAL_HEIGHT-20,rx=3)
    if labelled:draw.text(x+7,top+14,"MIDI ONLY / no dedicated panel control",9,"start",bold=True)
    elements=[]
    for i,entry in enumerate(entries):
        key=f"midi-{entry['id']}";kind="knob" if entry.get("kind") in ["knob","fader"] else "button"
        items=part_elements({**spec,"elements":{key:[entry]}},key,entry["label"],kind,(x+i*cw,top+18,cw,VIRTUAL_HEIGHT-40))
        open_part(draw,key,kind,entry["label"])
        draw_control(draw,kind,entry["label"],x+i*cw,top+18,cw,VIRTUAL_HEIGHT-40,labelled)
        close_part(draw,items,regions)
        elements+=items
    draw.parts.append("</g>")
    return elements


def render_device(identifier,spec,profile,folder):
    elements=[];bindings=profile.get("controls",[])
    panel_height=spec["height"]
    if spec.get("virtual"):
        spec={**spec,"height":panel_height+VIRTUAL_HEIGHT}
    descriptions="Original simplified top-down line drawing; positions are illustrative, not mechanical dimensions. Each physical control has a stable device-prefixed ID and data-part name; standalone buttons are disabled until a host adds input handlers. Transparent regions marked data-surface-control are the profile's MIDI hit areas, and several can share one context-dependent control."
    for labelled,filename,view in [(False,"panel.svg","panel"),(True,"interface.svg","interface")]:
        draw=Drawing(identifier,view,profile["name"]+(" labelled interface" if labelled else " overhead hardware diagram"),spec["width"],spec["height"],descriptions)
        # Only the panel is the live surface, so only it carries hit regions.
        regions=not labelled
        draw.parts.append(f'<g id="{draw.prefix}chassis" aria-hidden="true">')
        if spec.get("shell")=="handheld":
            w=spec["width"];h=spec["height"]
            draw.parts.append(f'<path d="M80 9H{w-80}Q{w-10} 9 {w-15} 90L{w-60} {h-70}Q{w-65} {h-9} {w-120} {h-9}H120Q65 {h-9} 60 {h-70}L15 90Q10 9 80 9Z" {OUTLINE} stroke-width="2"/>')
        else:
            draw.rect(9,9,spec["width"]-18,spec["height"]-18,rx=45 if spec.get("shell")=="arcana" else 12)
        draw.text(25,37,profile["name"],19,"start",bold=True)
        draw.text(spec["width"]-25,37,"INTERFACE" if labelled else "TOP VIEW",11,"end")
        for section in spec["groups"]:
            x,y,w,h=section["box"]
            draw.rect(x,y,w,h,rx=3)
            if labelled:draw.text(x+7,y+14,section["label"],9,"start",width=w-14,bold=True)
        draw.parts.append("</g>")
        used=set();current=[]
        for section in spec["groups"]:
            x,y,w,h=section["box"];labels=section["labels"];cols=section["columns"] or min(4,len(labels));rows=math.ceil(len(labels)/cols)
            cw=(w-12)/cols;ch=(h-35)/rows
            for i,value in enumerate(labels):
                label,sep,kind=value.partition("~");kind=kind if sep else section["kind"]
                key=slug(section["label"]+"-"+label);base=key;suffix=2
                while key in used:key=f"{base}-{suffix}";suffix+=1
                used.add(key)
                xx=x+6+(i%cols)*cw;yy=y+30+(i//cols)*ch
                item_w=cw;item_h=ch
                if section.get("positions"):
                    px,py,pw,ph=section["positions"][i]
                    xx=x+px*w;yy=y+30+py*(h-35);item_w=pw*w;item_h=ph*(h-35)
                binding=spec.get("bindings",{}).get(key) or next((c["id"] for c in bindings if c["id"]==key or slug(c["label"])==key or slug(c["label"])==slug(label)),None)
                items=part_elements(spec,key,section["label"]+": "+label,kind,(xx,yy,item_w,item_h),binding)
                open_part(draw,key,kind,section["label"]+": "+label)
                draw_control(draw,kind,label,xx,yy,item_w,item_h,labelled)
                close_part(draw,items,regions)
                current+=items
        if "keyboard" in spec:current+=keyboard(draw,spec,labelled,regions)
        if spec.get("virtual"):current+=virtual_strip(draw,spec,labelled,regions,panel_height-10)
        draw.save(folder/filename)
        if not labelled:elements=current
    return elements


def render_connections(spec,profile,folder):
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
    draw=Drawing(profile["id"],"connections",profile["name"]+" connections",1500,height,"Connection inventory. Arrows indicate signal direction relative to the instrument. Locations identify hardware faces; the diagram is not a socket placement drawing. Physical control sections are listed below.")
    draw.text(30,37,profile["name"]+" / CONNECTIONS",20,"start",bold=True)
    draw.text(30,63,"Arrows are relative to the device. Locations name the hardware face; sockets are grouped by function.",12,"start")
    for c,((title,_),ports) in enumerate(zip(columns,groups)):
        x=25+c*495;draw.rect(x,90,470,ports_height-100,rx=6);draw.text(x+18,116,title,13,"start",bold=True)
        if not ports:draw.text(x+18,155,"No connections in this category",12,"start")
        for i,p in enumerate(ports):
            y=145+i*62;key=f"port-{c}-{i+1}";label=p["label"];draw.parts.append(f'<g id="{draw.prefix}{key}" aria-label="{escape(label)}" data-direction="{p["direction"]}"><title>{escape(label)}</title>')
            connector=p["connector"]
            if "USB" in connector:draw.rect(x+16,y,30,20,rx=3)
            elif "DIN" in connector:
                draw.circle(x+31,y+10,13)
                for j in range(5):draw.circle(x+23+j*4,y+12+abs(j-2)*-2,1)
            else:draw.circle(x+31,y+10,11);draw.circle(x+31,y+10,4)
            draw.text(x+62,y+11,label,13,"start",width=315,bold=True)
            draw.text(x+62,y+32,connector+" / "+p["location"],10,"start",width=365)
            symbol="IN >" if p["direction"]=="input" else "> OUT" if p["direction"]=="output" else "< >" if p["direction"]=="bidirectional" else "CONTROL"
            draw.text(x+448,y+11,symbol,8,"end");draw.parts.append("</g>")
    draw.text(25,ports_height+28,"PHYSICAL CONTROLS / see interface.svg for labelled positions",12,"start",bold=True)
    for i,line in enumerate(inventory):
        draw.text(25,ports_height+52+i*18,line,11,"start")
    draw.save(folder/"connections.svg")


def main():
    LAYOUTS.update(json.loads((ROOT / "scripts" / "diagram-layouts.json").read_text(encoding="utf-8")))
    missing=set(PROFILES)-set(LAYOUTS)
    if missing:raise ValueError(f"Missing hardware layouts: {missing}")
    for identifier,path in PROFILES.items():
        profile=json.loads(path.read_text(encoding="utf-8"));spec=LAYOUTS[identifier];folder=path.parent
        elements=render_device(identifier,spec,profile,folder)
        render_connections(spec,profile,folder)
        height=spec["height"]+(VIRTUAL_HEIGHT if spec.get("virtual") else 0)
        profile["diagrams"]={"panel":"panel.svg","connections":"connections.svg","interface":"interface.svg"}
        # The unlabelled panel is the live surface; interface.svg is its labelled reference.
        profile["surface"]={"src":"panel.svg","width":spec["width"],"height":height,"elements":elements}
        profile["connections"]=spec["ports"]
        profile["diagramSources"]=spec["references"]
        notice=profile.get("notice","")
        notice=re.sub(r" Panel art is a schematic, not a scale hardware diagram\.","",notice)
        notice=re.sub(r" Surface notes are virtual chromatic pads starting at note 48, not factory keyboard octave assignments\.","",notice)
        profile["notice"]=notice
        path.write_text(json.dumps(profile,indent="\t",ensure_ascii=False)+"\n",encoding="utf-8",newline="\n")
    print(f"Generated {len(LAYOUTS)*3} monochrome SVG diagrams for {len(LAYOUTS)} devices")


if __name__=="__main__":main()
