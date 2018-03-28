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
import { StringMap, GL, concatLines, getObjectId, hasval } from './util/util';
import { Program, Uniform2f, Uniform1f, UniformSampler2D, Attribute } from './shader';
import { Buffer, newStaticBuffer } from './buffer';
import { BoundsUnmodifiable } from './bounds';
import { nearestPixel } from './misc';
import { xFrac, yFrac } from './core';

class TextureEntry {
    gl: WebGLRenderingContext;
    target: number;
    texture: WebGLTexture;
    textureUnit: number;

    constructor(gl: WebGLRenderingContext, target: number, texture: WebGLTexture) {
        this.gl = gl;
        this.target = target;
        this.texture = texture;
        this.textureUnit = -1;
    }
}


export interface TextureHelper {
    target(gl: WebGLRenderingContext): number;
    init(gl: WebGLRenderingContext, target: number): void;
}


export class Texture {
    private helper: TextureHelper;
    private textures: StringMap<TextureEntry>;

    constructor(helper: TextureHelper) {
        this.helper = helper;
        this.textures = {};
    }

    bind(gl: WebGLRenderingContext, textureUnit: number) {
        let glId = getObjectId(gl);
        if (hasval(this.textures[glId])) {
            let en = this.textures[glId];
            gl.activeTexture(GL.TEXTURE0 + textureUnit);
            gl.bindTexture(en.target, en.texture);
            en.textureUnit = textureUnit;
        }
        else {
            let target = this.helper.target(gl);
            let texture = gl.createTexture();
            if (!hasval(texture)) throw new Error('Failed to create texture');
            this.textures[glId] = new TextureEntry(gl, target, texture);

            let en = this.textures[glId];
            gl.activeTexture(GL.TEXTURE0 + textureUnit);
            gl.bindTexture(en.target, en.texture);
            en.textureUnit = textureUnit;

            this.helper.init(gl, target);
        }
    }

    unbind(gl: WebGLRenderingContext) {
        let glId = getObjectId(gl);
        if (hasval(this.textures[glId])) {
            let en = this.textures[glId];
            gl.activeTexture(GL.TEXTURE0 + en.textureUnit);
            gl.bindTexture(en.target, null);
            en.textureUnit = -1;
        }
    }

    dispose() {
        // XXX: Not sure this actually works ... may have to make each gl current or something
        for (let glid in this.textures) {
            if (this.textures.hasOwnProperty(glid)) {
                let en = this.textures[glid];
                en.gl.deleteTexture(en.texture);
            }
        }
        this.textures = {};
    }
}


export interface ImageDrawer {
    (context: CanvasRenderingContext2D): void;
}

export class FloatDataTexture2D extends Texture {
    private _w: number;
    private _h: number;

    get w(): number { return this._w; }
    get h(): number { return this._h; }

    constructor(w: number, h: number, array: Float32Array) {
        super({
            target: function (gl: WebGLRenderingContext): number {
                return GL.TEXTURE_2D;
            },
            init: function (gl: WebGLRenderingContext, target: number) {

                if (!gl.getExtension('OES_texture_float')) {
                    throw new Error('OES_texture_float extension is required');
                }

                gl.texParameteri(target, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
                gl.texParameteri(target, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
                gl.texParameteri(target, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
                gl.texParameteri(target, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);

                // GL.LUMINANCE isn't supported with GL.FLOAT
                gl.texImage2D(target, 0, GL.RGBA, w, h, 0, GL.RGBA, GL.FLOAT, array);
            }
        });

        this._w = w;
        this._h = h;
    }
}

export class Texture2D extends Texture {
    private _w: number;
    private _h: number;

    get w(): number { return this._w; }
    get h(): number { return this._h; }

    constructor(w: number, h: number, minFilter: number, magFilter: number, draw: ImageDrawer) {
        let canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        draw(canvas.getContext('2d'));

        super({
            target: function (gl: WebGLRenderingContext): number {
                return GL.TEXTURE_2D;
            },
            init: function (gl: WebGLRenderingContext, target: number) {
                gl.texParameteri(target, GL.TEXTURE_MAG_FILTER, magFilter);
                gl.texParameteri(target, GL.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(target, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
                gl.texParameteri(target, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
                gl.texImage2D(target, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, canvas);
            }
        });

        this._w = w;
        this._h = h;
    }
}


export interface TextureDrawOptions {
    xAnchor?: number;
    yAnchor?: number;
    rotation_CCWRAD?: number;
    width?: number;
    height?: number;
}


export class TextureRenderer {

    private textureRenderer_VERTSHADER = concatLines(
        '                                                                                                                 ',
        '  uniform vec2 u_XyFrac;                                                                                         ',
        '  uniform vec2 u_Anchor;                                                                                         ',
        '  uniform float u_Rotation_CCWRAD;                                                                               ',
        '  uniform vec2 u_ImageSize;                                                                                      ',
        '  uniform vec2 u_ViewportSize;                                                                                   ',
        '                                                                                                                 ',
        '  attribute vec2 a_ImageFrac;                                                                                    ',
        '                                                                                                                 ',
        '  varying vec2 v_StCoord;                                                                                        ',
        '                                                                                                                 ',
        '  void main( ) {                                                                                                 ',
        '      float cosRot = cos( u_Rotation_CCWRAD );                                                                   ',
        '      float sinRot = sin( u_Rotation_CCWRAD );                                                                   ',
        '                                                                                                                 ',
        '      // Column major                                                                                            ',
        '      mat2 rotation = mat2( cosRot, sinRot,                                                                      ',
        '                           -sinRot, cosRot );                                                                    ',
        '                                                                                                                 ',
        '      vec2 xy = -1.0 + 2.0*( u_XyFrac + rotation*( u_ImageSize*( a_ImageFrac - u_Anchor ) ) / u_ViewportSize );  ',
        '      gl_Position = vec4( xy, 0.0, 1.0 );                                                                        ',
        '                                                                                                                 ',
        '      v_StCoord = vec2( a_ImageFrac.x, 1.0 - a_ImageFrac.y );                                                    ',
        '  }                                                                                                              ',
        '                                                                                                                 '
    );

    private textureRenderer_FRAGSHADER = concatLines(
        '                                                         ',
        '  precision mediump float;                               ',
        '                                                         ',
        '  uniform sampler2D u_Sampler;                           ',
        '                                                         ',
        '  varying vec2 v_StCoord;                                ',
        '                                                         ',
        '  void main( ) {                                         ',
        '      gl_FragColor = texture2D( u_Sampler, v_StCoord );  ',
        '  }                                                      ',
        '                                                         '
    );


    private program: Program;
    private u_XyFrac: Uniform2f;
    private u_Anchor: Uniform2f;
    private u_Rotation_CCWRAD: Uniform1f;
    private u_ImageSize: Uniform2f;
    private u_ViewportSize: Uniform2f;
    private u_Sampler: UniformSampler2D;

    private a_ImageFrac: Attribute;

    private imageFracData: Buffer;

    private wViewport: number;
    private hViewport: number;


    constructor() {
        this.program = new Program(this.textureRenderer_VERTSHADER, this.textureRenderer_FRAGSHADER);
        this.u_XyFrac = new Uniform2f(this.program, 'u_XyFrac');
        this.u_Anchor = new Uniform2f(this.program, 'u_Anchor');
        this.u_Rotation_CCWRAD = new Uniform1f(this.program, 'u_Rotation_CCWRAD');
        this.u_ImageSize = new Uniform2f(this.program, 'u_ImageSize');
        this.u_ViewportSize = new Uniform2f(this.program, 'u_ViewportSize');
        this.u_Sampler = new UniformSampler2D(this.program, 'u_Sampler');

        this.a_ImageFrac = new Attribute(this.program, 'a_ImageFrac');
        this.imageFracData = newStaticBuffer(new Float32Array([0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]));

        this.wViewport = 0;
        this.hViewport = 0;
    }

    begin(gl: WebGLRenderingContext, viewport: BoundsUnmodifiable) {
        gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
        gl.enable(GL.BLEND);

        this.program.use(gl);
        this.u_ViewportSize.setData(gl, viewport.w, viewport.h);
        this.a_ImageFrac.setDataAndEnable(gl, this.imageFracData, 2, GL.FLOAT);

        this.wViewport = viewport.w;
        this.hViewport = viewport.h;
    }

    draw(gl: WebGLRenderingContext, texture: Texture2D, xFrac: number, yFrac: number, options?: TextureDrawOptions) {
        let xAnchor = (hasval(options) && hasval(options.xAnchor) ? options.xAnchor : 0.5);
        let yAnchor = (hasval(options) && hasval(options.yAnchor) ? options.yAnchor : 0.5);
        let rotation_CCWRAD = (hasval(options) && hasval(options.rotation_CCWRAD) ? options.rotation_CCWRAD : 0);
        let width = (hasval(options) && hasval(options.width) ? options.width : texture.w);
        let height = (hasval(options) && hasval(options.height) ? options.height : texture.h);

        this.u_XyFrac.setData(gl, nearestPixel(xFrac, this.wViewport, xAnchor, texture.w), nearestPixel(yFrac, this.hViewport, yAnchor, texture.h));
        this.u_Anchor.setData(gl, xAnchor, yAnchor);
        this.u_Rotation_CCWRAD.setData(gl, rotation_CCWRAD);
        this.u_ImageSize.setData(gl, width, height);
        this.u_Sampler.setDataAndBind(gl, 0, texture);
        gl.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
    }

    end(gl: WebGLRenderingContext) {
        this.a_ImageFrac.disable(gl);
        this.u_Sampler.unbind(gl);
        this.program.endUse(gl);
    }
}


