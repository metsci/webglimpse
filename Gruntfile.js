'use strict';

module.exports = function ( grunt ) {

    var _ = require( 'lodash' );

    var licenseText = grunt.file.read( 'HEADER' ).replace( /\n$/, '' );
    var sourceHeader = '/*\n' + licenseText.replace( /^/mg, ' * ' ).replace( / *$/mg, '' ) + '\n */';
    var mungedSourceHeader = '\n' + licenseText.replace( /^/mg, '* ' ).replace( / *$/mg, '' ) + '\n';

    var releaseVersion = '1.9.0-pre2';
    var releaseDate = grunt.template.today( 'UTC:yyyy-mm-dd HH:MM:ss Z' );
    var releaseText = [
        'Web Glimpse v' + releaseVersion,
        'Released: ' + releaseDate,
        'https://glimpse.metsci.com/webglimpse/',
        ''
    ].join( '\n' );
    var releaseHeader = '/*!\n' + ( releaseText + '\n' + licenseText ).replace( /^/mg, ' * ' ).replace( / *$/mg, '' ) + '\n */';



    //
    // Common
    //

    var commonConfig = {

        ts: {
            options: {
                target: 'es5',
                comments: true,
                sourceRoot: '.'
            }
        },

        clean: {
            build: [ 'build/grunt' ],
            misc: [ 'tscommand*.tmp.txt' ]
        }

    };

    var commonTasks = { };



    //
    // Dev
    //

    var devConfig = {

        ts: {
            dev: {
                src: [ 'src/**/*.ts' ],
                reference: 'src/reference.ts',
                out: 'build/grunt/dev/webglimpse-dev.js'
            }
        },

        watch: {
            dev: {
                files: [ 'src/**/*.ts' ],
                tasks: [ 'ts:dev' ]
            }
        },

        connect: {
            dev: {
                options: {
                    hostname: 'localhost',
                    port: 8000,
                    base: [ 'build/grunt/dev', 'src' ]
                }
            }
        },

        clean: {
            dev: [ 'build/grunt/dev' ]
        }

    };

    var devTasks = {
        build: [
            'ts:dev'
        ],
        serve: [
            'build',
            'connect:dev',
            'watch:dev'
        ]
    };



    //
    // Release
    //

    var releaseConfig = {

        copy: {
            release_sources: {
                expand: true,
                cwd: 'src/',
                src: [ '**' ],
                dest: 'build/grunt/release/'
            },
            release_license: {
                src: 'LICENSE',
                dest: 'build/grunt/release/'
            },
            release_changelog: {
                src: 'CHANGELOG',
                dest: 'build/grunt/release/'
            },
            release_webglimpse_defs: {
                expand: true,
                cwd: 'build/grunt/release/tmp/',
                src: 'webglimpse.d.ts',
                dest: 'build/grunt/release/'
            }
        },

        ts: {
            release_webglimpse: {
                src: [ 'build/grunt/release/webglimpse/**/*.ts' ],
                reference: 'build/grunt/release/reference.ts',
                out: 'build/grunt/release/tmp/webglimpse.js',
                options: {
                    declaration: true
                }
            },
            release_plot_example: {
                src: [
                    'build/grunt/release/webglimpse/defs/**/*.d.ts',
                    'build/grunt/release/webglimpse.d.ts',
                    'build/grunt/release/examples/defs/**/*.d.ts',
                    'build/grunt/release/examples/plot/**/*.ts'
                ],
                outDir: 'build/grunt/release/examples/plot/tmp/'
            },
            release_scroll_example: {
                src: [
                    'build/grunt/release/webglimpse/defs/**/*.d.ts',
                    'build/grunt/release/webglimpse.d.ts',
                    'build/grunt/release/examples/defs/**/*.d.ts',
                    'build/grunt/release/examples/scroll/**/*.ts'
                ],
                outDir: 'build/grunt/release/examples/scroll/tmp/'
            },
            release_timeline_example: {
                src: [
                    'build/grunt/release/webglimpse/defs/**/*.d.ts',
                    'build/grunt/release/webglimpse.d.ts',
                    'build/grunt/release/examples/defs/**/*.d.ts',
                    'build/grunt/release/examples/timeline/**/*.ts'
                ],
                outDir: 'build/grunt/release/examples/timeline/tmp/'
            }
        },

        uglify: {
            release_webglimpse: {
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true,
                    preserveComments: function( node, comment ) {
                        return ( comment.value !== mungedSourceHeader );
                    },
                    banner: releaseHeader,
                    sourceMap: true,
                    sourceMapIn: 'build/grunt/release/tmp/webglimpse.js.map'
                },
                files: {
                    'build/grunt/release/webglimpse.js': [ 'build/grunt/release/tmp/webglimpse.js' ]
                }
            },
            release_plot_example: {
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true,
                    preserveComments: function( node, comment ) {
                        return ( comment.value !== mungedSourceHeader );
                    },
                    banner: releaseHeader,
                    sourceMap: true,
                    sourceMapIn: 'build/grunt/release/examples/plot/tmp/plot.js.map'
                },
                files: {
                    'build/grunt/release/examples/plot/plot.js': [ 'build/grunt/release/examples/plot/tmp/plot.js' ]
                }
            },
            release_scroll_example: {
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true,
                    preserveComments: function( node, comment ) {
                        return ( comment.value !== mungedSourceHeader );
                    },
                    banner: releaseHeader,
                    sourceMap: true,
                    sourceMapIn: 'build/grunt/release/examples/scroll/tmp/scroll.js.map'
                },
                files: {
                    'build/grunt/release/examples/scroll/scroll.js': [ 'build/grunt/release/examples/scroll/tmp/scroll.js' ]
                }
            },
            release_timeline_example: {
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true,
                    preserveComments: function( node, comment ) {
                        return ( comment.value !== mungedSourceHeader );
                    },
                    banner: releaseHeader,
                    sourceMap: true,
                    sourceMapIn: 'build/grunt/release/examples/timeline/tmp/timeline.js.map'
                },
                files: {
                    'build/grunt/release/examples/timeline/timeline.js': [ 'build/grunt/release/examples/timeline/tmp/timeline.js' ]
                }
            }
        },

        replace: {
            release_reference: {
                // Remove examples from reference.ts
                src: [ 'build/grunt/release/reference.ts' ],
                dest: 'build/grunt/release/reference.ts',
                replacements: [ {
                    from: /\/\/\/\s*<reference\s+path="examples\/.*?"\s*\/>/g,
                    to: ''
                }, {
                    from: /\/\/\s*Examples/g,
                    to: ''
                } ]
            },
            release_html: {
                src: [ 'build/grunt/release/**/*.html' ],
                overwrite: true,
                replacements: [ {
                    from: /<!-- DEV_BEGIN -->/g,
                    to: '<!-- DEV_BEGIN --><!--'
                }, {
                    from: /<!-- DEV_END -->/g,
                    to: '--><!-- DEV_END -->'
                }, {
                    from: /<!-- RELEASE_BEGIN --><!--/g,
                    to: '<!-- RELEASE_BEGIN -->'
                }, {
                    from: /--><!-- RELEASE_END -->/g,
                    to: '<!-- RELEASE_END -->'
                } ]
            },
            release_webglimpse_defs: {
                // Remove ref tags from webglimpse.d.ts
                src: [ 'build/grunt/release/webglimpse.d.ts' ],
                overwrite: true,
                replacements: [ {
                    from: /\/\/\/\s*<reference\s+path=".*?"\s*\/>/g,
                    to: ''
                } ]
            }
        },

        connect: {
            release: {
                options: {
                    hostname: 'localhost',
                    port: 8001,
                    base: [ 'build/grunt/release' ],
                    keepalive: true
                }
            }
        },

        clean: {
            release_webglimpse_tmp: [ 'build/grunt/release/tmp' ],
            release_plot_example_tmp: [ 'build/grunt/release/examples/plot/tmp' ],
            release_scroll_example_tmp: [ 'build/grunt/release/examples/scroll/tmp' ],
            release_timeline_example_tmp: [ 'build/grunt/release/examples/timeline/tmp' ],
            release: [ 'build/grunt/release' ]
        }

    };

    var releaseTasks = {
        release: [
            // Clean
            'clean:release',
            // Copy all, and modify copies
            'copy:release_sources',
            'copy:release_license',
            'copy:release_changelog',
            'replace:release_reference',
            // Compile webglimpse, and modify generated
            'ts:release_webglimpse',
            'uglify:release_webglimpse',
            'copy:release_webglimpse_defs',
            'replace:release_webglimpse_defs',
            'clean:release_webglimpse_tmp',
            // Compile examples, and modify generated
            'ts:release_plot_example',
            'ts:release_scroll_example',
            'ts:release_timeline_example',
            'uglify:release_plot_example',
            'uglify:release_scroll_example',
            'uglify:release_timeline_example',
            'clean:release_plot_example_tmp',
            'clean:release_scroll_example_tmp',
            'clean:release_timeline_example_tmp',
            'replace:release_html'
        ],
        serve_release: [
            'release',
            'connect:release'
        ]
    };



    //
    // Util
    //

    var utilConfig = {

        copy: {
            prepend_source_headers: {
                cwd: 'src/',
                src: [ '**/*.ts', '!**/*.d.ts', '!reference.ts' ],
                dest: 'src/',
                expand: true,
                options: {
                    process: function( content ) {
                        var hasHeader = ( content.substring( 0, sourceHeader.length ) === sourceHeader );
                        return ( hasHeader ? content : sourceHeader + '\n' + content );
                    }
                }
            }
        }

    };

    var utilTasks = {
        add_headers: [
            'copy:prepend_source_headers'
        ]
    };



    //
    // Grunt
    //

    require( 'load-grunt-tasks' )( grunt );

    grunt.initConfig( _.merge( commonConfig, devConfig, releaseConfig, utilConfig ) );

    var tasks = _.merge( commonTasks, devTasks, releaseTasks, utilTasks );
    for ( var taskName in tasks ) {
        if ( tasks.hasOwnProperty( taskName ) ) {
            grunt.registerTask( taskName, tasks[ taskName ] );
        }
    }

    grunt.registerTask( 'default', [ 'build' ] );

};

