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
    
    export class IntervalTree<V> extends BinaryTree<V> {
        
        constructor( comparator : Comparator<V> ) {
            super( comparator );
        }
        
        insert( value : V ) {
            super.insert( value );
        }
        
        private updateHighValue0( value : V, node : TreeNode<V> ) : V {
            
            var treeNode = <IntervalTreeNode<V>> node;
            
            // find the appropriate spot and insert the node
            var comp : number = node == null ? 0 : this.compare( value, node.value );
            if ( comp < 0 ) {
                value = this.updateHighValue0( value, node.left );
            }
            else if ( comp > 0 ) {
                value = this.updateHighValue0( value, node.right );
            }
            
            // either treeNode is equal to value (in which case it is a leaf node)
            // or we just updated the high value of this node's child
            return treeNode.updateHigh( value );
        }
        
        newTreeNode0( value : V ) {
            return new IntervalTreeNode( value );
        }
        
    }
    
    export class IntervalTreeNode<V> extends TreeNode<V> {
        private _high : V;
        
        get high( ) : V {
            return this._high;    
        }
        
        set high( value : V ) {
            this._high = value;    
        }
        
        updateHigh( value : V ) : V {
            if ( this._high === undefined || value > this._high ) {
                this._high = value;
            }
            
            return this._high;
        }
    }
}