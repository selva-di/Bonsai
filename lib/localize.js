'use strict';

/*
 * An AngularJS Localization Service
 *
 * Written by Jim Lavin
 * http://codingsmackdown.tv
 *
 */

angular.module('localization', [])
    // localization service responsible for retrieving resource files from the server and
    // managing the translation dictionary
    .factory('localize', ['$http', '$rootScope', '$window', '$filter', function ($http, $rootScope, $window, $filter) {
        var localize = {
            // TODO: Make the language config work in a non insane way.
            // use the $window service to get the language of the user's browser
            //language:'de-DE',// $window.navigator.userLanguage || $window.navigator.language,
            language: document.getElementsByTagName('html')[0].lang,
            
            // array to hold the localized resource string entries
            dictionary:[],
            
            // flag to indicate if the service hs loaded the resource file
            resourceFileLoaded:false,

            // success handler for all server communication
            successCallback:function (data) {
                // store the returned array in the dictionary
                localize.dictionary = data;
                // set the flag that the resource are loaded
                localize.resourceFileLoaded = true;
                // broadcast that the file has been loaded
                $rootScope.$broadcast('localizeResourcesUpdates');
            },

            // allows setting of language on the fly
            setLanguage: function(value) {
                localize.language = value;
                localize.initLocalizedResources();
            },

            // loads the language resource file from the server
            initLocalizedResources:function () {
                // build the url to retrieve the localized resource file
                var url = '../i18n/resources-locale_' + localize.language + '.js';
                // request the resource file
                $http({ method:"GET", url:url, cache:false }).success(localize.successCallback).error(function () {
                    // the request failed set the url to the default resource file
                    var url = '../i18n/resources-locale_default.js';
                    // request the default resource file
                    $http({ method:"GET", url:url, cache:false }).success(localize.successCallback);
                });
            },

            // checks the dictionary for a localized resource string
            getLocalizedString: function(value) {
                // default the result to an empty string
                var result = '';

                // make sure the dictionary has valid data
                if ((localize.dictionary !== []) && (localize.dictionary.length > 0)) {
                    // use the filter service to only return those entries which match the value
                    // and only take the first result
                    var entry = $filter('filter')(localize.dictionary, function(element) {
                            return element.key === value;
                        }
                    )[0];

                    // check for localized string found
                    if (entry == undefined){
                    	console.log("Nicht lokalisierter String:" + value)
                    	return value;
                    }
                    
                    // set the result
                    result = entry.value;
                }
                // return the value to the call
                return result;
            }
        };

        // force the load of the resource file
        localize.initLocalizedResources();

        // return the local instance when called
        return localize;
    } ])
    // simple translation filter
    // usage {{ TOKEN | i18n }}
    .filter('i18n', ['localize', function (localize) {
        return function (input) {
            return localize.getLocalizedString(input);
        };
    }])
    // translation directive that can handle dynamic strings
    // updates the text value of the attached element
    // usage <span data-i18n="TOKEN" ></span>
    // or
    // <span data-i18n="TOKEN|VALUE1|VALUE2" ></span>
    .directive('i18n', ['localize', function(localize){
        var i18nDirective = {
            restrict:"EAC",
            updateText:function(elm, token){
                var values = token.split('|');
                if (values.length >= 1) {
                    // construct the tag to insert into the element
                    var tag = localize.getLocalizedString(values[0]);
                    // update the element only if data was returned
                    if ((tag !== null) && (tag !== undefined) && (tag !== '')) {
                        if (values.length > 1) {
                            for (var index = 1; index < values.length; index++) {
                                var target = '{' + (index - 1) + '}';
                                tag = tag.replace(target, values[index]);
                            }
                        }
                        // insert the text into the element
                        elm.text(tag);
                    };
                }
            },

            link:function (scope, elm, attrs) {
                scope.$on('localizeResourcesUpdates', function() {
                    i18nDirective.updateText(elm, attrs.i18n);
                });

                attrs.$observe('i18n', function (value) {
                    i18nDirective.updateText(elm, value);
                });
            }
        };

        return i18nDirective;
    }])
    // translation directive that can handle dynamic strings
    // updates the attribute value of the attached element
    // usage <span data-i18n-attr="TOKEN|ATTRIBUTE" ></span>
    // or
    // <span data-i18n-attr="TOKEN|ATTRIBUTE|VALUE1|VALUE2" ></span>
    .directive('i18nAttr', ['localize', function (localize) {
        var i18NAttrDirective = {
            restrict: "EAC",
            updateText:function(scope, elm, token){
                if(token != undefined)
                {
                    var values = token.split('|');
                    var attrName = values[1];
                    
                    // construct the tag to insert into the element
                    var tag = localize.getLocalizedString(values[0]);
                    
                    // update the element only if data was returned
                    if ((tag !== null) && (tag !== undefined) && (tag !== '')) {
                        if (values.length > 2) {
                            for (var index = 2; index < values.length; index++) {
                                var target = '{' + (index - 2) + '}';
                                tag = tag.replace(target, values[index]);
                            }
                        }
                        
                        // update the text of the elements current attriubte 
                        elm.attr(attrName, tag);
                        
                        // check for placeholder attribute that is not supported by older browsers
                        // like ie9 and prio versions
                        if(attrName == 'placeholder' && !Modernizr.input.placeholder) {
                            // set inital value of the input field
                            elm.val(tag);
                            // add placeholder class
                            elm.addClass('placeholder');
                            
                            elm.bind('focus', function(){
                                if( elm.val() === tag) {
                                    // field focused remove inital value
                                    elm.val('');
                                    // remove placeholder class
                                    elm.removeClass('placeholder');
                                }
                            });
                            elm.bind('blur', function(){
                                if( elm.val() === '' || elm.val() === undefined ) {
                                    // field is left empty so reset inital value
                                    elm.val(tag);
                                    // add placeholder class
                                    elm.addClass('placeholder');
                                }
                            });   
                        }
                    }
                }
            },
            link: function (scope, elm, attrs) {
                scope.$on('localizeResourcesUpdates', function() {
                    i18NAttrDirective.updateText(scope, elm, attrs.i18nAttr);
                });

                attrs.$observe('i18nAttr', function (value) {
                    i18NAttrDirective.updateText(elm, value);
                }); 
            }
        };

        return i18NAttrDirective;
    }]);