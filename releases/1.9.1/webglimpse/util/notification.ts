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


    export interface Listener {
        /**
         * A truthy return value indicates the event was consumed by the listener and no other listeners should be notified
         */
        ( ) : any;
    }


    export interface Listener1<A> {
        /**
         * A truthy return value indicates the event was consumed by the listener and no other listeners should be notified
         */
        ( a : A ) : any;
    }


    export interface Listener2<A,B> {
        /**
         * A truthy return value indicates the event was consumed by the listener and no other listeners should be notified
         */
        ( a : A, b : B ) : any;
    }


    export interface Listener3<A,B,C> {
        /**
         * A truthy return value indicates the event was consumed by the listener and no other listeners should be notified
         */
        ( a : A, b : B, c : C ) : any;
    }


    interface Action {
        ( ) : void;
    }


    export class Notification {
        private _listeners : OrderedSet<Listener> = new OrderedSet<Listener>( [], getObjectId, false );
        private _deferring : boolean = false;
        private _deferred : Action[] = [];

        on( listener : Listener ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.add( listener ); } );
            }
            else {
                this._listeners.add( listener );
            }
        }

        off( listener : Listener ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.removeValue( listener ); } );
            }
            else {
                this._listeners.removeValue( listener );
            }
        }
        
        dispose( ) {
            this._listeners.removeAll( );
        }

        fire( ) : any {
            this._deferring = true;
            try {
                for ( var n = 0; n < this._listeners.length; n++ ) {
                    var consumed = this._listeners.valueAt( n )( );
                    if ( consumed ) return consumed;
                }
                return false;
            }
            finally {
                if ( this._deferred.length > 0 ) {
                    for ( var n = 0; n < this._deferred.length; n++ ) {
                        this._deferred[ n ]( );
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        }
    }


    export class Notification1<A> {
        private _listeners : OrderedSet<Listener1<A>> = new OrderedSet<Listener1<A>>( [], getObjectId, false );
        private _deferring : boolean = false;
        private _deferred : Action[] = [];

        on( listener : Listener1<A> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.add( listener ); } );
            }
            else {
                this._listeners.add( listener );
            }
        }

        off( listener : Listener1<A> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.removeValue( listener ); } );
            }
            else {
                this._listeners.removeValue( listener );
            }
        }
        
        dispose( ) {
            this._listeners.removeAll( );
        }

        fire( a : A ) : any {
            this._deferring = true;
            try {
                for ( var n = 0; n < this._listeners.length; n++ ) {
                    var consumed = this._listeners.valueAt( n )( a );
                    if ( consumed ) return consumed;
                }
                return false;
            }
            finally {
                if ( this._deferred.length > 0 ) {
                    for ( var n = 0; n < this._deferred.length; n++ ) {
                        this._deferred[ n ]( );
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        }
    }


    export class Notification2<A,B> {
        private _listeners : OrderedSet<Listener2<A,B>> = new OrderedSet<Listener2<A,B>>( [], getObjectId, false );
        private _deferring : boolean = false;
        private _deferred : Action[] = [];

        on( listener : Listener2<A,B> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.add( listener ); } );
            }
            else {
                this._listeners.add( listener );
            }
        }

        off( listener : Listener2<A,B> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.removeValue( listener ); } );
            }
            else {
                this._listeners.removeValue( listener );
            }
        }
        
        dispose( ) {
            this._listeners.removeAll( );
        }

        fire( a : A, b : B ) : any {
            this._deferring = true;
            try {
                for ( var n = 0; n < this._listeners.length; n++ ) {
                    var consumed = this._listeners.valueAt( n )( a, b );
                    if ( consumed ) return consumed;
                }
                return false;
            }
            finally {
                if ( this._deferred.length > 0 ) {
                    for ( var n = 0; n < this._deferred.length; n++ ) {
                        this._deferred[ n ]( );
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        }
    }


    export class Notification3<A,B,C> {
        private _listeners : OrderedSet<Listener3<A,B,C>> = new OrderedSet<Listener3<A,B,C>>( [], getObjectId, false );
        private _deferring : boolean = false;
        private _deferred : Action[] = [];

        on( listener : Listener3<A,B,C> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.add( listener ); } );
            }
            else {
                this._listeners.add( listener );
            }
        }

        off( listener : Listener3<A,B,C> ) {
            if ( this._deferring ) {
                var self = this;
                this._deferred.push( function( ) { self._listeners.removeValue( listener ); } );
            }
            else {
                this._listeners.removeValue( listener );
            }
        }
        
        dispose( ) {
            this._listeners.removeAll( );
        }

        fire( a : A, b : B, c : C ) : any {
            this._deferring = true;
            try {
                for ( var n = 0; n < this._listeners.length; n++ ) {
                    var consumed = this._listeners.valueAt( n )( a, b, c );
                    if ( consumed ) return consumed;
                }
                return false;
            }
            finally {
                if ( this._deferred.length > 0 ) {
                    for ( var n = 0; n < this._deferred.length; n++ ) {
                        this._deferred[ n ]( );
                    }
                    this._deferred = [];
                }
                this._deferring = false;
            }
        }
    }


}