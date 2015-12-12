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
}).filter('valueX', function () {
        return function (name, value) {
            if (name === "valueQuantity") {
                var result = value.value + " " + value.unit;
                if (typeof value.comparator !== 'undefined' && value.comparator !== "")
                    result = value.comparator + "" + result;
                return result;
            } else if (name === "valueCodeableConcept") {
                    if (typeof value.coding === 'undefined' ) {
                        return value.coding.display + ":" + value.coding.code;
                    }
                    return value.text;
            } else if (name === "valueString") {
                return value;
            } else if (name === "valueRange") {
                return value.low + " to " + value.high;
            } else if (name === "valueRatio") {
                return value.numerator + "/" + value.denominator;
            } else if (name === "valueTime") {
                return value;
            } else if (name === "valueDateTime") {
                return value;
            } else if (name === "valuePeriod") {
                return value.start + " to " + value.end;
            } else {
                return value;
            }
        };
});