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



    export interface MultiKeyCacheHelper<V> {
        create( keyParts : string[] ) : V;
        dispose( value : V, keyParts : string[] );
    }


    class MultiKeyCacheEntry<V> {
        keyParts : string[];
        value : V;
        touched : boolean = false;

        constructor( keyParts : string[], value : V ) {
            this.keyParts = keyParts;
            this.value = value;
        }
    }


    export class MultiKeyCache<V> {
        private helper : MultiKeyCacheHelper<V>;
        private map : { [ key : string ] : MultiKeyCacheEntry<V>; };

        constructor( helper : MultiKeyCacheHelper<V> ) {
            this.helper = helper;
            this.map = { };
        }

        private combineKeyParts( keyParts : string[] ) : string {
            var esc = '\\';
            var sep = ';';
            var escapedEsc = esc + esc;
            var escapedSep = esc + sep;

            var escapedParts = <string[]> [ ];
            for ( var n = 0; n < keyParts.length; n++ ) {
                escapedParts[ n ] = keyParts[ n ].replace( esc, escapedEsc ).replace( sep, escapedSep );
            }
            return escapedParts.join( sep );
        }

        value( ...keyParts : string[] ) : V {
            var key = this.combineKeyParts( keyParts );
            if ( !this.map.hasOwnProperty( key ) ) {
                this.map[ key ] = new MultiKeyCacheEntry<V>( keyParts, this.helper.create( keyParts ) );
            }
            var en = this.map[ key ];

            en.touched = true;
            return en.value;
        }

        remove( ...keyParts : string[] ) {
            var key = this.combineKeyParts( keyParts );
            if ( this.map.hasOwnProperty( key ) ) {
                var en = this.map[ key ];
                this.helper.dispose( en.value, en.keyParts );
                delete this.map[ key ];
            }
        }

        retain( ...keyParts : string[] ) {
            var newMap : { [ k : string ] : MultiKeyCacheEntry<V>; } = { };
            var retainKey = this.combineKeyParts( keyParts );
            if ( this.map.hasOwnProperty( retainKey ) ) {
                newMap[ retainKey ] = this.map[ retainKey ];
                delete this.map[ retainKey ];
            }
            for ( var key in this.map ) {
                if ( this.map.hasOwnProperty( key ) ) {
                    var en = this.map[ key ];
                    this.helper.dispose( en.value, en.keyParts );
                }
            }
            this.map = newMap;
        }

        resetTouches( ) {
            for ( var key in this.map ) {
                if ( this.map.hasOwnProperty( key ) ) {
                    this.map[ key ].touched = false;
                }
            }
        }

        retainTouched( ) {
            var newMap : { [ key : string ] : MultiKeyCacheEntry<V>; } = { };
            for ( var key in this.map ) {
                if ( this.map.hasOwnProperty( key ) ) {
                    var en = this.map[ key ];
                    if ( en.touched ) {
                        newMap[ key ] = this.map[ key ];
                    }
                    else {
                        this.helper.dispose( en.value, en.keyParts );
                    }
                }
            }
            this.map = newMap;
        }

        clear( ) {
            for ( var key in this.map ) {
                if ( this.map.hasOwnProperty( key ) ) {
                    var en = this.map[ key ];
                    this.helper.dispose( en.value, en.keyParts );
                }
            }
            this.map = { };
        }
    }


    export interface TwoKeyCacheHelper<V> {
        create( keyPart1 : string, keyPart2 : string ) : V;
        dispose( value : V, keyPart1 : string, keyPart2 : string );
    }


    export class TwoKeyCache<V> {
        private cache : MultiKeyCache<V>;

        constructor( helper : TwoKeyCacheHelper<V> ) {
            this.cache = new MultiKeyCache<V>( {
                create: function( keyParts : string[] ) : V {
                    return helper.create( keyParts[ 0 ], keyParts[ 1 ] );
                },
                dispose: function( value : V, keyParts : string[] ) {
                    helper.dispose( value, keyParts[ 0 ], keyParts[ 1 ] );
                }
            } );
        }

        value( keyPart1 : string, keyPart2 : string ) : V { return this.cache.value( keyPart1, keyPart2 ); }
        remove( keyPart1 : string, keyPart2 : string ) { this.cache.remove( keyPart1, keyPart2 ); }
        retain( keyPart1 : string, keyPart2 : string ) { this.cache.retain( keyPart1, keyPart2 ); }
        resetTouches( ) { this.cache.resetTouches( ); }
        retainTouched( ) { this.cache.retainTouched( ); }
        clear( ) { this.cache.clear( ); }
    }


    export interface ThreeKeyCacheHelper<V> {
        create( keyPart1 : string, keyPart2 : string, keyPart3 : string ) : V;
        dispose( value : V, keyPart1 : string, keyPart2 : string, keyPart3 : string );
    }


    export class ThreeKeyCache<V> {
        private cache : MultiKeyCache<V>;

        constructor( helper : ThreeKeyCacheHelper<V> ) {
            this.cache = new MultiKeyCache<V>( {
                create: function( keyParts : string[] ) : V {
                    return helper.create( keyParts[ 0 ], keyParts[ 1 ], keyParts[ 2 ] );
                },
                dispose: function( value : V, keyParts : string[] ) {
                    helper.dispose( value, keyParts[ 0 ], keyParts[ 1 ], keyParts[ 2 ] );
                }
            } );
        }

        value( keyPart1 : string, keyPart2 : string, keyPart3 : string ) : V { return this.cache.value( keyPart1, keyPart2, keyPart3 ); }
        remove( keyPart1 : string, keyPart2 : string, keyPart3 : string ) { this.cache.remove( keyPart1, keyPart2, keyPart3 ); }
        retain( keyPart1 : string, keyPart2 : string, keyPart3 : string ) { this.cache.retain( keyPart1, keyPart2, keyPart3 ); }
        resetTouches( ) { this.cache.resetTouches( ); }
        retainTouched( ) { this.cache.retainTouched( ); }
        clear( ) { this.cache.clear( ); }
    }


