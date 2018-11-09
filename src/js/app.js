'use strict';

angular.module('pdmApp', ['ngMaterial', 'ngAnimate', 'ui.bootstrap', 'smart-table', 'pdmApp.filters', 'pdmApp.services', 'pdmApp.controllers', 'pdmApp.directives'])
    .factory('_', function($window) {
        return $window._; // assumes underscore is loaded on the page
    });