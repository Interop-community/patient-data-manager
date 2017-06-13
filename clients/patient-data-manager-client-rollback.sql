SET AUTOCOMMIT = 0;

START TRANSACTION;

-- Patient Data Manager App
DELETE FROM client_grant_type WHERE owner_id = (SELECT id from client_details where client_id = 'patient_data_manager');
DELETE FROM client_scope WHERE owner_id = (SELECT id from client_details where client_id = 'patient_data_manager');
DELETE FROM client_details WHERE client_id = 'patient_data_manager';

COMMIT;

SET AUTOCOMMIT = 1;
