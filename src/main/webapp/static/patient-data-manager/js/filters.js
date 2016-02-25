'use strict';

/* Filters */

angular.module('pdmApp.filters', []).filter('age', function() {
	return function(date) {
		var yearNow = new Date().getYear();
		var monthNow = new Date().getMonth();
		var dateNow = new Date().getDate();


		var yearDob = new Date(date).getYear();
		var monthDob = new Date(date).getMonth();
		var dateDob = new Date(date).getDate();

		var yearAge = yearNow - yearDob;
		var monthAge = null;
		var dateAge = null;

		if (monthNow >= monthDob)
			monthAge = monthNow - monthDob;
		else {
			yearAge--;
			monthAge = 12 + monthNow - monthDob;
		}

		if (dateNow >= dateDob)
			dateAge = dateNow - dateDob;
		else {
			monthAge--;
			dateAge = 31 + dateNow - dateDob;
			if (monthAge < 0) {
				monthAge = 11;
				yearAge--;
			}
		}

		if ( (yearAge > 0) && (monthAge > 0) && (dateAge > 0) )
			return yearAge + "y " + monthAge + "m " + dateAge + "d";
		else if ( (yearAge > 0) && (monthAge > 0) && (dateAge == 0) )
			return yearAge + "y " + monthAge + "m";
		else if ( (yearAge > 0) && (monthAge == 0) && (dateAge > 0) )
			return yearAge + "y " + dateAge + "d";
		else if ( (yearAge > 0) && (monthAge == 0) && (dateAge == 0) )
			return yearAge + "y";
		else if ( (yearAge == 0) && (monthAge > 0) && (dateAge > 0) )
			return monthAge + "m " + dateAge + "d";
		else if ( (yearAge == 0) && (monthAge > 0) && (dateAge == 0) )
			return monthAge + "m";
		else if ( (yearAge == 0) && (monthAge == 0) && (dateAge > 0) )
			return dateAge + "d";
		else return "Could not calculate age";
	};
}).filter('formatAttribute', function ($filter) {
        return function (input) {
            if (Object.prototype.toString.call(input) === '[object Date]') {
                return $filter('date')(input, 'MM/dd/yyyy HH:mm');
            } else {
                return input;
            }
        };
}).filter('fhirTypeFilter', function ($filter) {
        return function (name, value) {

            switch(name) {
                case 'Quantity':
                    var result = value.value + " " + value.unit;
                    if (typeof value.comparator !== 'undefined' && value.comparator !== "")
                        result = value.comparator + "" + result;
                    return result;
                    break;
                case 'SimpleQuantity':
                    return value.value + " " + value.unit;
                    break;
                case 'CodeableConcept':
                    if (typeof value.coding === 'undefined' ) {
                        return value.coding.display + ":" + value.coding.code;
                    }
                    return value.text;
                    break;
                case 'Range':
                    return value.low.value + " " + value.low.unit + " to " + value.high.value + " " + value.high.unit;
                    break;
                case 'Ratio':
                    return value.numerator.value + "/" + value.denominator.value + " " + value.numerator.unit;
                    break;
                case 'Period':
                    return $filter('date')(value.start, 'MM/dd/yyyy HH:mm') + " to " + $filter('date')(value.end, 'MM/dd/yyyy HH:mm');
                    break;
                case 'DateTime':
                    return  $filter('date')(value, 'MM/dd/yyyy HH:mm');
                    break;
                case 'Time':
                    return  $filter('date')(value, 'HH:mm');
                    break;
                case 'String':
                default:
                    return value;
            }
        };
});