package com.shelf.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgres()) {
            return;
        }

        if (!tableExists("consumption_logs")) {
            return;
        }

        repairConsumptionLogsEventTypeConstraint();
    }

    private boolean isPostgres() {
        try {
            String version = jdbcTemplate.queryForObject("select version()", String.class);
            return version != null && version.toLowerCase().contains("postgresql");
        } catch (Exception ex) {
            log.debug("Could not determine database version for schema repair; skipping.", ex);
            return false;
        }
    }

    private boolean tableExists(String tableName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "select count(*) from information_schema.tables where table_schema = 'public' and table_name = ?",
                    Integer.class,
                    tableName);
            return count != null && count > 0;
        } catch (Exception ex) {
            log.debug("Could not verify table existence for {}. Skipping check.", tableName, ex);
            return false;
        }
    }

    private void repairConsumptionLogsEventTypeConstraint() {
        try {
            jdbcTemplate.execute("alter table consumption_logs drop constraint if exists consumption_logs_event_type_check");
            jdbcTemplate.execute(
                    "alter table consumption_logs add constraint consumption_logs_event_type_check check (event_type in ('ADD','PROGRESS','REWATCH_PROGRESS'))");
            log.info("Ensured consumption_logs_event_type_check includes REWATCH_PROGRESS.");
        } catch (Exception ex) {
            log.warn("Failed to repair consumption_logs event_type constraint automatically.", ex);
        }
    }
}
