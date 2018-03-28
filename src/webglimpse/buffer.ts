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
import { StringMap, GL, getObjectId, hasval } from './util/util';

export interface Buffer {
    bind(gl: WebGLRenderingContext, target: number): void;
    unbind(gl: WebGLRenderingContext, target: number): void;
    dispose(): void;
}

export interface DynamicBuffer extends Buffer {
    setData(newData: Float32Array): void;
}

export function newStaticBuffer(data: Float32Array): Buffer {
    return new StaticBufferImpl(data);
}

export function newDynamicBuffer(data: Float32Array = new Float32Array(0)): DynamicBuffer {
    return new DynamicBufferImpl(data);
}


class BufferEntry {
    gl: WebGLRenderingContext;
    buffer: WebGLBuffer;
    capacity: number = 0;
    marker: number = null;

    constructor(gl: WebGLRenderingContext, buffer: WebGLBuffer) {
        this.gl = gl;
        this.buffer = buffer;
    }
}

class AbstractBuffer implements Buffer {
    private buffers: StringMap<BufferEntry> = {};
    private currentMarker: number = 0;

    init(gl: WebGLRenderingContext, target: number): number {
        throw new Error('Method is abstract');
    }

    update(gl: WebGLRenderingContext, target: number, capacity: number): number {
        throw new Error('Method is abstract');
    }

    setDirty() {
        this.currentMarker++;
    }

    bind(gl: WebGLRenderingContext, target: number) {
        let glId = getObjectId(gl);
        if (this.buffers[glId] === undefined) {
            let buffer = gl.createBuffer();
            if (!hasval(buffer)) throw new Error('Failed to create buffer');
            this.buffers[glId] = new BufferEntry(gl, buffer);

            gl.bindBuffer(target, this.buffers[glId].buffer);
            this.buffers[glId].capacity = this.init(gl, target);
            this.buffers[glId].marker = this.currentMarker;
        }
        else if (this.buffers[glId].marker !== this.currentMarker) {
            gl.bindBuffer(target, this.buffers[glId].buffer);
            this.buffers[glId].capacity = this.update(gl, target, this.buffers[glId].capacity);
            this.buffers[glId].marker = this.currentMarker;
        }
        else {
            gl.bindBuffer(target, this.buffers[glId].buffer);
        }
    }

    unbind(gl: WebGLRenderingContext, target: number) {
        gl.bindBuffer(target, null);
    }

    dispose() {
        // XXX: Not sure this actually works ... may have to make each gl current or something
        for (let glid in this.buffers) {
            if (this.buffers.hasOwnProperty(glid)) {
                let en = this.buffers[glid];
                en.gl.deleteBuffer(en.buffer);
            }
        }
        this.buffers = {};
    }
}


class StaticBufferImpl extends AbstractBuffer {
    private _data: Float32Array;

    constructor(data: Float32Array) {
        super();
        this._data = data;
    }

    init(gl: WebGLRenderingContext, target: number): number {
        gl.bufferData(target, this._data, GL.STATIC_DRAW);
        return this._data.byteLength;
    }

    update(gl: WebGLRenderingContext, target: number, capacity: number): number {
        throw new Error('This buffer is static and should never need to be updated');
    }
}


class DynamicBufferImpl extends AbstractBuffer implements DynamicBuffer {
    private _data: Float32Array;

    constructor(data: Float32Array) {
        super();
        this._data = data;
    }

    setData(data: Float32Array) {
        this._data = data;
        this.setDirty();
    }

    init(gl: WebGLRenderingContext, target: number): number {
        gl.bufferData(target, this._data, GL.DYNAMIC_DRAW);
        return this._data.byteLength;
    }

    update(gl: WebGLRenderingContext, target: number, capacity: number): number {
        if (this._data.byteLength <= capacity) {
            gl.bufferSubData(target, 0, this._data);
            return capacity;
        }
        else {
            gl.bufferData(target, this._data, GL.DYNAMIC_DRAW);
            return this._data.byteLength;
        }
    }
}


