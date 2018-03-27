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



    function compileShader( gl : WebGLRenderingContext, shaderType : number, glsl : string ) : WebGLShader {
        var shader = gl.createShader( shaderType );
        gl.shaderSource( shader, glsl );

        gl.compileShader( shader );
        if ( !gl.getShaderParameter( shader, GL.COMPILE_STATUS ) ) throw new Error( gl.getShaderInfoLog( shader ) );

        return shader;
    }

    function linkProgram( gl : WebGLRenderingContext, shaders : WebGLShader[] ) : WebGLProgram {
        var program = gl.createProgram( );
        for ( var i = 0; i < shaders.length; i++ ) {
            gl.attachShader( program, shaders[ i ] );
        }
        try {
            gl.linkProgram( program );
            if ( !gl.getProgramParameter( program, GL.LINK_STATUS ) ) throw new Error( gl.getProgramInfoLog( program ) );
            return program;
        }
        finally {
            // It's good GL practice to detach and delete shaders after they have been linked
            // into a program, and are no longer needed. However, on some versions of Firefox,
            // doing so causes getAttribLocation and getUniformLocation to fail.
            //
            //for ( var i = 0; i < shaders.length; i++ ) {
            //    gl.detachShader( program, shaders[ i ] );
            //}
        }
    }

    function createProgram( gl : WebGLRenderingContext, vertShaderSource : string, fragShaderSource : string ) : WebGLProgram {
        var shaders = [ ];
        try {
            shaders.push( compileShader( gl, GL.VERTEX_SHADER, vertShaderSource ) );
            shaders.push( compileShader( gl, GL.FRAGMENT_SHADER, fragShaderSource ) );
            return linkProgram( gl, shaders );
        }
        finally {
            // It's good GL practice to detach and delete shaders after they have been linked
            // into a program, and are no longer needed. However, on some versions of Firefox,
            // doing so causes getAttribLocation and getUniformLocation to fail.
            //
            //for ( var i = 0; i < shaders.length; i++ ) {
            //    gl.deleteShader( shaders[ i ] );
            //}
        }
    }


    class ProgramEntry {
        gl : WebGLRenderingContext;
        program : WebGLProgram;

        constructor( gl : WebGLRenderingContext, program : WebGLProgram ) {
            this.gl = gl;
            this.program = program;
        }
    }

    export class Program {
        private vertShaderSource : string;
        private fragShaderSource : string;
        private programs : StringMap<ProgramEntry> = { };

        constructor( vertShaderSource : string, fragShaderSource : string ) {
            this.vertShaderSource = vertShaderSource;
            this.fragShaderSource = fragShaderSource;
        }

        // XXX: Would be nice if this weren't public
        _program( gl : WebGLRenderingContext ) : WebGLProgram {
            var glId = getObjectId( gl );
            if ( this.programs[ glId ] === undefined ) {
                var program = createProgram( gl, this.vertShaderSource, this.fragShaderSource );
                this.programs[ glId ] = new ProgramEntry( gl, program );
            }
            return this.programs[ glId ].program;
        }

        use( gl : WebGLRenderingContext ) {
            gl.useProgram( this._program( gl ) );
        }

        endUse( gl : WebGLRenderingContext ) {
            gl.useProgram( null );
        }

        dispose( ) {
            // XXX: Not sure this actually works ... may have to make each gl current or something
            for ( var glid in this.programs ) {
                if ( this.programs.hasOwnProperty( glid ) ) {
                    var en = this.programs[ glid ];
                    en.gl.deleteProgram( en.program );
                }
            }
            this.programs = { };
        }
    }


    export class Uniform {
        private program : Program;
        private name : string;
        private optional : boolean;
        private locations : StringMap<WebGLUniformLocation> = { };

        constructor( program : Program, name : string, optional : boolean ) {
            this.program = program;
            this.name = name;
            this.optional = optional;
        }

        // XXX: Would be nice if this weren't public
        _location( gl : WebGLRenderingContext ) : WebGLUniformLocation {
            var glId = getObjectId( gl );
            if ( this.locations[ glId ] === undefined ) {
                var location = gl.getUniformLocation( this.program._program( gl ), this.name );
                if ( !this.optional && !hasval( location ) ) throw new Error( 'Uniform \'' + this.name + '\' not found' );
                this.locations[ glId ] = location;
            }
            return this.locations[ glId ];
        }
    }


    export class Uniform1f extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform1f( location, x );
        }
    }

    export class Uniform2f extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform2f( location, x, y );
        }
    }

    export class Uniform3f extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number, z : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform3f( location, x, y, z );
        }
    }

    export class Uniform4f extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number, z : number, w : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform4f( location, x, y, z, w );
        }
    }

    export class UniformMatrix4f extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, value : Float32Array, transpose : boolean = false ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniformMatrix4fv( location, transpose, value );
        }
    }

    export class Uniform1i extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform1i( location, x );
        }
    }

    export class Uniform2i extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform2i( location, x, y );
        }
    }

    export class Uniform3i extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number, z : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform3i( location, x, y, z );
        }
    }

    export class Uniform4i extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, x : number, y : number, z : number, w : number ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform4i( location, x, y, z, w );
        }
    }

    export class UniformColor extends Uniform {
        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setData( gl : WebGLRenderingContext, color : Color ) {
            var location = this._location( gl );
            if ( hasval( location ) ) gl.uniform4f( location, color.r, color.g, color.b, color.a );
        }
    }


    export class UniformSampler2D extends Uniform {
        private currentTexture : Texture;

        constructor( program : Program, name : string, optional : boolean = false ) {
            super( program, name, optional );
        }

        setDataAndBind( gl : WebGLRenderingContext, textureUnit : number, texture : Texture ) {
            var location = this._location( gl );
            if ( hasval( location ) ) {
                texture.bind( gl, textureUnit );
                gl.uniform1i( location, textureUnit );
                this.currentTexture = texture;
            }
        }

        unbind( gl : WebGLRenderingContext ) {
            if ( hasval( this.currentTexture ) ) {
                this.currentTexture.unbind( gl );
                this.currentTexture = null;
            }
        }
    }


    export class Attribute {
        private program : Program;
        private name : string;
        private locations : StringMap<number> = { };

        constructor( program : Program, name : string ) {
            this.program = program;
            this.name = name;
        }

        // XXX: Would be nice if this weren't public
        _location( gl : WebGLRenderingContext ) : number {
            var glId = getObjectId( gl );
            if ( this.locations[ glId ] === undefined ) {
                var location = gl.getAttribLocation( this.program._program( gl ), this.name );
                if ( location === -1 ) throw new Error( 'Attribute "' + this.name + '" not found' );
                this.locations[ glId ] = location;
            }
            return this.locations[ glId ];
        }

        setDataAndEnable( gl : WebGLRenderingContext, buffer : Buffer, size : number, type : number, normalized : boolean = false, stride : number = 0, offset : number = 0 ) {
            var location = this._location( gl );
            gl.enableVertexAttribArray( location );
            buffer.bind( gl, GL.ARRAY_BUFFER );
            gl.vertexAttribPointer( location, size, type, normalized, stride, offset );
            buffer.unbind( gl, GL.ARRAY_BUFFER );
        }

        disable( gl : WebGLRenderingContext ) {
            gl.disableVertexAttribArray( this._location( gl ) );
        }
    }


