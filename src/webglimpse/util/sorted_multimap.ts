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


    // A sorted map which allows multiple string values per key (K)
    export class SortedMultimap<K,V> {

        private _tree : BinaryTree<Container<K,V>>;
        private _idFn : IdFunction<V>;

        constructor( comparator : Comparator<K>, idFn : IdFunction<V> = getObjectId ) {
            this._tree = new BinaryTree<Container<K,V>>( this.createContainerComparator<V>( comparator ) );
            this._idFn = idFn;
        }

        private createContainerComparator<V>( comparator : Comparator<K> ) : Comparator<Container<K,V>> {
            return {
                compare : function( container1 : Container<K,V>, container2 : Container<K,V> ) : number {
                    return comparator.compare( container1.key, container2.key );
                }
            }
        }

        // Inserts the value into the tree. Nothing is inserted if the value already exists
        insert( key : K, value : V ) {
            var wrappedKey = new Container<K,V>( key );
            var values : Container<K,V> = this._tree.getValue( wrappedKey );

            if ( values === null ) {
                values = wrappedKey;
                this._tree.insert( values );
            }

            values.add( value, this._idFn );
        }

        remove( key : K, value : V ) {
            var wrappedKey = new Container<K,V>( key );
            var values : Container<K,V> = this._tree.getValue( wrappedKey );

            if ( values === null ) return;

            values.remove( value, this._idFn );

            if ( values.size === 0 ) {
                this._tree.remove( values );
            }
        }

        contains( key : K, value : V ) {
            var wrappedKey = new Container<K,V>( key );
            var values : Container<K,V> = this._tree.getValue( wrappedKey );

            if ( values === null ) {
                return false;
            }
            else {
                return values.contains( value, this._idFn );
            }
        }

        // Returns the lowest element greater than or equal to the given value, or null if no such element exists
        ceiling( key : K ) : V[] {
            return this.unwrap( this._tree.ceiling( this.wrap( key ) ) );
        }

        // Returns the greatest element less than or equal to the given value, or null if no such element exists
        floor( key : K ) : V[] {
            return this.unwrap( this._tree.floor( this.wrap( key ) ) );
        }

        // Returns the greatest element strictly less than the given value, or null if no such element exists
        lower( key : K ) : V[] {
            return this.unwrap( this._tree.lower( this.wrap( key ) ) );
        }

        // Returns the lowest element strictly greater than the given value, or null if no such element exists
        higher( key : K ) : V[] {
            return this.unwrap( this._tree.higher( this.wrap( key ) ) );
        }

        // Returns all elements greater than (or equal to, if inclusive is true) the provided value (sorted from low to high)
        headSet( key : K, inclusive : boolean = true ) : V[] {
            return this.unwrapArray( this._tree.headSet( this.wrap( key ), inclusive ) );
        }

        // Returns all elements less than ( or equal to, if inclusive is true) the provided value (sorted from low to high)
        tailSet( key : K, inclusive : boolean = false ) : V[] {
            return this.unwrapArray( this._tree.tailSet( this.wrap( key ), inclusive ) );
        }

        // Returns all elements between the provided values (sorted from low to high)
        subSet( low : K, high : K, lowInclusive : boolean = true, highInclusive : boolean = false ) : V[] {
            var wrappedLow = new Container<K,V>( low );
            var wrappedHigh = new Container<K,V>( high );
            var values : Container<K,V>[] = this._tree.subSet( wrappedLow, wrappedHigh, lowInclusive, highInclusive );
            return this.unwrapArray( values );
        }

        // Returns all keys in the tree (sorted from low to high)
        toArray( ) : V[] {
            return this.unwrapArray( this._tree.toArray( ) );
        }

        iterator( ) : Iterator<V> {

            var iter : Iterator<Container<K,V>> = this._tree.iterator( );
            var currentArray : V[] = null;
            var currentIndex : number = 0;

            return {
                next: function( ) : V {

                    var value : V;

                    if ( currentArray == null || currentIndex >= currentArray.length ) {
                        currentArray = iter.next( ).toArray( );
                        currentIndex = 0;
                        value = currentArray[currentIndex];
                    }
                    else {
                        value = currentArray[currentIndex];
                    }

                    currentIndex += 1;

                    return value;
                },
                hasNext: function( ) : boolean {
                    return iter.hasNext( ) || ( currentArray != null && currentIndex < currentArray.length );
                }
            }
        }

        private wrap( key : K ) : Container<K,V> {
            return new Container<K,V>( key );
        }

        private unwrap( values : Container<K,V> ) : V[] {
            if ( values === null ) {
                return [];
            }
            else {
                return values.toArray( );
            }
        }

        private unwrapArray( values : Container<K,V>[] ) : V[] {
            var unwrappedValues : V[] = new Array<V>( );
            values.forEach( function( value : Container<K,V> ) {
                value.toArray( ).forEach( function ( value : V ) {
                    unwrappedValues.push( value );
                });
            } );

            return unwrappedValues;
        }
    }

    export class SortedStringMultimap<K> extends SortedMultimap<K,string> {
        constructor( comparator : Comparator<K> ) {
            super( comparator, (value)=>value );
        }
    }

    // a container which stores a set of values (V) associated with a sorted key (K)
    // OrderedSet or even BinaryTree could be used here instead
    // more sophisticated set implementation: http://stackoverflow.com/questions/7958292/mimicking-sets-in-javascript
    class Container<K,V> {

        private _key : K;
        private _values : StringMap<V>;

        constructor( key : K ) {
            this._key = key;
            this._values = {};
        }

        get size( ) : number {
            return this.toArray( ).length;
        }

        get key( ) : K {
            return this._key;
        }

        get values( ) : StringMap<V> {
            return this._values;
        }

        toArray( ) : V[] {
            return Object.keys(this._values).map(key => this._values[key]);
        }

        contains( value : V, idFn : IdFunction<V> ) : boolean {
            // safer than 'value in this._values' because of potential conflict with built in properties/methods
            return Object.prototype.hasOwnProperty.call( this._values, idFn( value ) );
        }

        add( value : V, idFn : IdFunction<V> ) {
            this._values[ idFn( value ) ] = value;
        }

        remove( value : V, idFn : IdFunction<V> ) {
            delete this._values[ idFn( value ) ];
        }
    }

