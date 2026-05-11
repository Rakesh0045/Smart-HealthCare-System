package com.healthcare.repository;

import com.healthcare.entity.EpisodeFollowup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EpisodeFollowupRepository extends JpaRepository<EpisodeFollowup, Long> {

    @Query("SELECT f FROM EpisodeFollowup f WHERE f.episode.id = :episodeId ORDER BY f.createdAt DESC")
    List<EpisodeFollowup> findByEpisodeIdOrderByCreatedAtDesc(@Param("episodeId") Long episodeId);

    @Query("SELECT f FROM EpisodeFollowup f WHERE f.appointment.id = :appointmentId")
    List<EpisodeFollowup> findByAppointmentId(@Param("appointmentId") Long appointmentId);
}
