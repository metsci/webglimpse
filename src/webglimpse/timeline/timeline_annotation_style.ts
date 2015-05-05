/*
 * Copyright (c) 2014, Metron, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
module Webglimpse {

    export interface TimelineAnnotationIcon {
        url : string;
        displayWidth : number; // horizontal size of icon in pixels
        displayHeight : number; // vertical size of icon in pixels
        hAlign : number; // relative location of center pixel of icon (0=left side, 1=right side)
        vAlign : number; // relative location of center pixel of icon (0=left side, 1=right side)
    }

    export interface TimelineAnnotationStyle {
        styleGuid : string;
        icons : TimelineAnnotationIcon[];
    }
    
    export class TimelineAnnotationIconUi {
        private _url : string;
        private _displayWidth : number;
        private _displayHeight : number;
        private _hAlign : number;
        private _vAlign : number;

        constructor( icon : TimelineAnnotationIcon ) {
            this._setAttrs( icon );
        }

        private _setAttrs( icon : TimelineAnnotationIcon ) {
            this._url = icon.url;
            this._displayWidth = icon.displayWidth;
            this._displayHeight = icon.displayHeight;
            this._hAlign = icon.hAlign;
            this._vAlign = icon.vAlign;
        }

        get url( ) : string { return this._url; }
        get displayWidth( ) : number { return this._displayWidth; }
        get displayHeight( ) : number { return this._displayHeight; }
        get hAlign( ) : number { return this._hAlign; }
        get vAlign( ) : number { return this._vAlign; }

        snapshot( ) : TimelineAnnotationIcon {
            return {
                url: this._url,
                displayWidth: this._displayWidth,
                displayHeight: this._displayHeight,
                hAlign: this._hAlign,
                vAlign: this._vAlign
            };
        }
    }



    export class TimelineAnnotationStyleUi {
        private _styleGuid : string;
        private _icons : TimelineAnnotationIconUi[];

        constructor( style : TimelineAnnotationStyle ) {
            this._styleGuid = style.styleGuid;
            this._setAttrs( style );
        }

        get styleGuid( ) : string {
            return this._styleGuid;
        }

        private _setAttrs( style : TimelineAnnotationStyle ) {
            this._icons = style.icons.map( ( icon )=>{ return new TimelineAnnotationIconUi( icon ); } );
        }

        get numIcons( ) : number {
            return this._icons.length;
        }

        icon( index : number ) : TimelineAnnotationIconUi {
            return this._icons[ index ];
        }

        snapshot( ) : TimelineAnnotationStyle {
            return {
                styleGuid: this._styleGuid,
                icons: this._icons.map( (ui)=>ui.snapshot() )
            };
        }
    }

}