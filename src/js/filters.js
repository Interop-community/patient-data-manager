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
}).filter('nameGivenFamily', function () {
	return function(p){
		var isArrayName = p && p.name && p.name[0];
		var personName;

		if (isArrayName) {
			personName = p && p.name && p.name[0];
			if (!personName) return null;

		} else {
			personName = p && p.name;
			if (!personName) return null;
		}

		var user;
		if (Object.prototype.toString.call(personName.family) === '[object Array]') {
			user = personName.given.join(" ") + " " + personName.family.join(" ");
		} else {
			user = personName.given.join(" ") + " " + personName.family;
		}
		if (personName.suffix) {
			user = user + ", " + personName.suffix.join(", ");
		}
		return user;
	};
}).filter('nameFamilyGiven', function () {
	return function(p){
		var isArrayName = p && p.name && p.name[0];
		var personName;

		if (isArrayName) {
			personName = p && p.name && p.name[0];
			if (!personName) return null;

		} else {
			personName = p && p.name;
			if (!personName) return null;
		}

		var user;
		if (Object.prototype.toString.call(personName.family) === '[object Array]') {
			user = personName.family.join(" ") + ", " + personName.given.join(" ");
		} else {
			user = personName.family + ", " + personName.given.join(" ");
		}
		if (personName.suffix) {
			user = user + ", " + personName.suffix.join(", ");
		}

		return user;
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
                    if (typeof value.coding !== 'undefined' ) {
						return value.coding[0].display + ":" + value.coding[0].code;
                    }
                    return value.text;
                    break;
				case 'Coding':
					if (typeof value !== 'undefined' ) {
						return value.display + ":" + value.code;
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
                case 'Date':
                    return  $filter('date')(value, 'MM/dd/yyyy');
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
}).filter('ageFilter', function () {
	return function(dob) {
		// var dob = patient.birthDate;
		if (!dob) return "";

		//fix year or year-month style dates
		if (/\d{4}$/.test(dob))
			dob = dob + "-01";
		if (/\d{4}-d{2}$/.test(dob))
			dob = dob + "-01";

		return moment(dob).fromNow(true)
			.replace("a ", "1 ")
			.replace(/minutes?/, "min");
	}
}).filter('capFilter', function () {
	return function(input) {
		return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
	}
});