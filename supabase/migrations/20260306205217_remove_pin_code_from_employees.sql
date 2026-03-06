-- Migration to remove pin_code column from employees table

ALTER TABLE employees DROP COLUMN IF EXISTS pin_code;
