-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 25, 2023 at 11:50 AM
-- Server version: 10.4.10-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `svendeprove`
--
CREATE DATABASE IF NOT EXISTS `svendeprove` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `svendeprove`;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `Id` int(11) NOT NULL,
  `Name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `Name` text NOT NULL,
  `Description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `timeentries`
--

CREATE TABLE `timeentries` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `UserId` int(11) DEFAULT NULL,
  `Start` timestamp NOT NULL DEFAULT current_timestamp(),
  `End` timestamp NOT NULL DEFAULT current_timestamp(),
  `Duration` int(11) NOT NULL,
  `GroupingId` int(11) DEFAULT NULL,
  `LocationId` int(11) NOT NULL,
  `TimeEntryTypeId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `timeentry_messages`
--

CREATE TABLE `timeentry_messages` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `TimeEntryId` int(11) NOT NULL,
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `Message` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `timetags`
--

CREATE TABLE `timetags` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `Name` text NOT NULL,
  `BasisType` text NOT NULL,
  `BasisAmount` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `timetag_rules`
--

CREATE TABLE `timetag_rules` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `TimeTagId` int(11) NOT NULL,
  `Name` text NOT NULL,
  `Type` text NOT NULL,
  `FromTime` time NOT NULL,
  `ToTime` time NOT NULL,
  `Amount` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `time_entry_types`
--

CREATE TABLE `time_entry_types` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `Name` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `time_entry_type_collections`
--

CREATE TABLE `time_entry_type_collections` (
  `Id` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `TimeEntryTypeId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `UserRoleId` int(11) NOT NULL,
  `FullName` text NOT NULL,
  `FirstName` text NOT NULL,
  `MiddleName` text DEFAULT NULL,
  `SurName` text NOT NULL,
  `ProfileImage` int(11) DEFAULT NULL,
  `HiredDate` timestamp NULL DEFAULT NULL,
  `FiredDate` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `user_logins`
--

CREATE TABLE `user_logins` (
  `Id` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `Username` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `LastLogin` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `Id` int(11) NOT NULL,
  `CompanyId` int(11) NOT NULL,
  `Name` text NOT NULL,
  `Description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `user_role_permissions`
--

CREATE TABLE `user_role_permissions` (
  `Id` int(11) NOT NULL,
  `Name` text NOT NULL,
  `Description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `x_location_leaders`
--

CREATE TABLE `x_location_leaders` (
  `LocationId` int(11) NOT NULL,
  `UserId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `x_timetag_rule_weekdays`
--

CREATE TABLE `x_timetag_rule_weekdays` (
  `TimeTagRuleId` int(11) NOT NULL,
  `Weekday` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Holiday') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `x_time_entry_type_collection_timetags`
--

CREATE TABLE `x_time_entry_type_collection_timetags` (
  `TimeEntryTypeCollectionId` int(11) NOT NULL,
  `TimeTagId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `x_user_locations`
--

CREATE TABLE `x_user_locations` (
  `UserId` int(11) NOT NULL,
  `LocationId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`,`CompanyId`) USING HASH,
  ADD KEY `CompanyId` (`CompanyId`);

--
-- Indexes for table `timeentries`
--
ALTER TABLE `timeentries`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `CompanyId` (`CompanyId`),
  ADD KEY `UserId` (`UserId`),
  ADD KEY `LocationId` (`LocationId`),
  ADD KEY `TimeEntryTypeId` (`TimeEntryTypeId`),
  ADD KEY `Start` (`Start`),
  ADD KEY `End` (`End`),
  ADD KEY `GroupingId` (`GroupingId`);

--
-- Indexes for table `timeentry_messages`
--
ALTER TABLE `timeentry_messages`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `CreatedAt` (`CreatedAt`),
  ADD KEY `CompanyId` (`CompanyId`),
  ADD KEY `UserId` (`UserId`),
  ADD KEY `TimeEntryId` (`TimeEntryId`);

--
-- Indexes for table `timetags`
--
ALTER TABLE `timetags`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`,`CompanyId`) USING HASH,
  ADD KEY `CompanyId` (`CompanyId`);

--
-- Indexes for table `timetag_rules`
--
ALTER TABLE `timetag_rules`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`,`CompanyId`) USING HASH,
  ADD KEY `CompanyId` (`CompanyId`),
  ADD KEY `TimeTagId` (`TimeTagId`);

--
-- Indexes for table `time_entry_types`
--
ALTER TABLE `time_entry_types`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`,`CompanyId`) USING HASH,
  ADD KEY `CompanyId` (`CompanyId`);

--
-- Indexes for table `time_entry_type_collections`
--
ALTER TABLE `time_entry_type_collections`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `UserId` (`UserId`),
  ADD KEY `CompanyId` (`CompanyId`),
  ADD KEY `TimeEntryTypeId` (`TimeEntryTypeId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`Id`),
  ADD KEY `CompanyId` (`CompanyId`),
  ADD KEY `HiredDate` (`HiredDate`),
  ADD KEY `FiredDate` (`FiredDate`),
  ADD KEY `UserRoleId` (`UserRoleId`);

--
-- Indexes for table `user_logins`
--
ALTER TABLE `user_logins`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `UserId` (`UserId`),
  ADD UNIQUE KEY `Username` (`Username`),
  ADD KEY `CompanyId` (`CompanyId`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`,`CompanyId`) USING HASH,
  ADD KEY `CompanyId` (`CompanyId`);

--
-- Indexes for table `user_role_permissions`
--
ALTER TABLE `user_role_permissions`
  ADD PRIMARY KEY (`Id`),
  ADD UNIQUE KEY `Name` (`Name`) USING HASH;

--
-- Indexes for table `x_location_leaders`
--
ALTER TABLE `x_location_leaders`
  ADD PRIMARY KEY (`LocationId`,`UserId`);

--
-- Indexes for table `x_timetag_rule_weekdays`
--
ALTER TABLE `x_timetag_rule_weekdays`
  ADD PRIMARY KEY (`TimeTagRuleId`,`Weekday`);

--
-- Indexes for table `x_time_entry_type_collection_timetags`
--
ALTER TABLE `x_time_entry_type_collection_timetags`
  ADD PRIMARY KEY (`TimeEntryTypeCollectionId`,`TimeTagId`) USING BTREE;

--
-- Indexes for table `x_user_locations`
--
ALTER TABLE `x_user_locations`
  ADD PRIMARY KEY (`UserId`,`LocationId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timeentries`
--
ALTER TABLE `timeentries`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timeentry_messages`
--
ALTER TABLE `timeentry_messages`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timetags`
--
ALTER TABLE `timetags`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timetag_rules`
--
ALTER TABLE `timetag_rules`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `time_entry_types`
--
ALTER TABLE `time_entry_types`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `time_entry_type_collections`
--
ALTER TABLE `time_entry_type_collections`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_logins`
--
ALTER TABLE `user_logins`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_role_permissions`
--
ALTER TABLE `user_role_permissions`
  MODIFY `Id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `timeentries`
--
ALTER TABLE `timeentries`
  ADD CONSTRAINT `timeentries_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `timeentries_ibfk_2` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `timeentries_ibfk_3` FOREIGN KEY (`LocationId`) REFERENCES `locations` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `timeentries_ibfk_4` FOREIGN KEY (`TimeEntryTypeId`) REFERENCES `time_entry_types` (`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `timeentry_messages`
--
ALTER TABLE `timeentry_messages`
  ADD CONSTRAINT `timeentry_messages_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `timeentry_messages_ibfk_2` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `timeentry_messages_ibfk_3` FOREIGN KEY (`TimeEntryId`) REFERENCES `timeentries` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `timetags`
--
ALTER TABLE `timetags`
  ADD CONSTRAINT `timetags_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `timetag_rules`
--
ALTER TABLE `timetag_rules`
  ADD CONSTRAINT `timetag_rules_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `timetag_rules_ibfk_2` FOREIGN KEY (`TimeTagId`) REFERENCES `timetags` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `time_entry_types`
--
ALTER TABLE `time_entry_types`
  ADD CONSTRAINT `time_entry_types_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `time_entry_type_collections`
--
ALTER TABLE `time_entry_type_collections`
  ADD CONSTRAINT `time_entry_type_collections_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `time_entry_type_collections_ibfk_2` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `time_entry_type_collections_ibfk_3` FOREIGN KEY (`TimeEntryTypeId`) REFERENCES `time_entry_types` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`UserRoleId`) REFERENCES `user_roles` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `user_logins`
--
ALTER TABLE `user_logins`
  ADD CONSTRAINT `user_logins_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_logins_ibfk_2` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`CompanyId`) REFERENCES `companies` (`Id`) ON UPDATE CASCADE;

--
-- Constraints for table `x_location_leaders`
--
ALTER TABLE `x_location_leaders`
  ADD CONSTRAINT `x_location_leaders_ibfk_1` FOREIGN KEY (`LocationId`) REFERENCES `locations` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `x_location_leaders_ibfk_2` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `x_timetag_rule_weekdays`
--
ALTER TABLE `x_timetag_rule_weekdays`
  ADD CONSTRAINT `x_timetag_rule_weekdays_ibfk_1` FOREIGN KEY (`TimeTagRuleId`) REFERENCES `timetag_rules` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `x_time_entry_type_collection_timetags`
--
ALTER TABLE `x_time_entry_type_collection_timetags`
  ADD CONSTRAINT `x_time_entry_type_collection_timetags_ibfk_1` FOREIGN KEY (`TimeEntryTypeCollectionId`) REFERENCES `time_entry_type_collections` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `x_time_entry_type_collection_timetags_ibfk_2` FOREIGN KEY (`TimeTagId`) REFERENCES `timetags` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `x_user_locations`
--
ALTER TABLE `x_user_locations`
  ADD CONSTRAINT `x_user_locations_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `x_user_locations_ibfk_2` FOREIGN KEY (`LocationId`) REFERENCES `locations` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
