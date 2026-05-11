package com.healthcare.dto.response;

import lombok.*;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MedicalHistoryTimelineResponse {
    private MedicalHistoryResponse summary;
    private List<EpisodeRecordsGroup> episodes;
    private List<MedicalRecordResponse> standaloneRecords;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EpisodeRecordsGroup {
        private Long episodeId;
        private String episodeName;
        private String primaryDiagnosis;
        private String conditionCategory;
        private String status;
        private String startDate;
        private String endDate;
        private List<MedicalRecordResponse> records;
    }
}
