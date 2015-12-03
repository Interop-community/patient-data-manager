/* Filters */

angular.module('pdmApp.directives', []).directive('resourceForm', [ function() {
    return {
        templateUrl : 'js/templates/dynamicForm.html',
        replace : true,
        restrict: 'E',
        scope : {
            selectedResourceConfig : '=resourceConfig',
            newObservation : '=resource',
            getValueSetExpansion: '&'
        }
    };
}]).directive("dynamicName",function($compile){
        return {
            restrict:"A",
            terminal:true,
            priority:1000,
            link:function(scope,element,attrs){
                element.attr('name', scope.$eval(attrs.dynamicName));
                element.removeAttr("dynamic-name");
                $compile(element)(scope);
            }
        }
});
//    .directive('stSelectRow', ['stConfig', function (stConfig) {
//    return {
//        restrict: 'A',
//        require: '^stTable',
//        scope: {
//            row: '=stSelectRow'
//        },
//        link: function (scope, element, attr, ctrl) {
//            var mode = attr.stSelectMode || stConfig.select.mode;
//            element.bind('click', function () {
//                scope.$apply(function () {
//                    ctrl.select(scope.row, mode);
//                });
//            });
//
//            scope.$watch('row.isSelected', function (newValue) {
//                if (newValue === true) {
//                    element.addClass(stConfig.select.selectedClass);
//                } else {
//                    element.removeClass(stConfig.select.selectedClass);
//                }
//            });
//        }
//    };
//}]);